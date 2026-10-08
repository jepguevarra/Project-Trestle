import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { and, eq, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { generateInvitationToken, hashInvitationToken, INVITATION_TTL_MS } from "../tokens/invitation";
import { definitionSchema } from "../instruments/definition";
import { TEMPLATE_VERSION } from "../instruments/readiness-templates";
import { createInstrumentFromDefinition } from "./mutations/instruments";
import {
  client,
  engagement,
  engagementAssignment,
  instrument,
  instrumentTemplate,
  invitation,
  membership,
  organization,
  recordMessage,
  respondent,
} from "./schema";
import { syncSystemTemplates } from "./system-templates";
import * as schema from "./schema";

config({ path: [".env.local", ".env"], quiet: true });

/**
 * `pnpm db:seed` — two orgs, three users, a pending invitation, and per org two clients with an
 * engagement each (of different types), so a fresh clone is usable in one command.
 *
 * Users are created through Supabase Auth's normal sign-up (anon key), so the real sign-up trigger
 * creates each owner's org. Cross-org memberships are then added with the owner connection. Safe
 * to re-run. Needs the Supabase stack (`supabase start`) and `pnpm db:migrate` first.
 */

const PASSWORD = "trestle-dev-password";

const USERS = [
  { email: "alice@acme.test", orgName: "Acme Consulting" },
  { email: "bob@beacon.test", orgName: "Beacon Partners" },
  { email: "carol@freelance.test", orgName: undefined },
] as const;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const dbUrl = process.env.DATABASE_URL;
  if (!url || !anonKey || !dbUrl) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and DATABASE_URL.");

  const connection = postgres(dbUrl, { max: 1, onnotice: () => {} });
  const db = drizzle(connection, { schema });

  const ids: Record<string, string> = {};
  for (const u of USERS) {
    const existing = await db.execute<{ id: string }>(sql`select id from auth.users where email = ${u.email}`);
    if (existing[0]) {
      ids[u.email] = existing[0].id;
      continue;
    }
    // A fresh client per user so no session carries over between sign-ups.
    const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data, error } = await supabase.auth.signUp({
      email: u.email,
      password: PASSWORD,
      options: { data: u.orgName ? { org_name: u.orgName } : {} },
    });
    if (error || !data.user) throw new Error(`sign-up failed for ${u.email}: ${error?.message ?? "no user"}`);
    ids[u.email] = data.user.id;
  }

  const orgByName = async (name: string) => {
    const [org] = await db.select().from(organization).where(eq(organization.name, name)).limit(1);
    if (!org) throw new Error(`org ${name} missing — did the sign-up trigger run? Run pnpm db:migrate first.`);
    return org;
  };
  const acme = await orgByName("Acme Consulting");
  const beacon = await orgByName("Beacon Partners");

  // Carol consults for Acme and has read access at Beacon, so the org switcher has two entries.
  for (const [orgId, role] of [
    [acme.id, "consultant"],
    [beacon.id, "viewer"],
  ] as const) {
    const userId = ids["carol@freelance.test"]!;
    const [m] = await db
      .select()
      .from(membership)
      .where(and(eq(membership.orgId, orgId), eq(membership.userId, userId)));
    if (!m) await db.insert(membership).values({ orgId, userId, role });
  }

  // Clients and engagements (phase 02). Found by name, so re-running changes nothing.
  type EngagementSeed = {
    name: string;
    type: (typeof engagement.$inferInsert)["type"];
    targetSystem: string;
    targetGoLive: string | null;
  };
  const ensureEngagement = async (
    orgId: string,
    clientSeed: { name: string; industry: string; sizeBand: "micro" | "small" | "medium" | "large" },
    e: EngagementSeed,
    createdBy: string,
  ) => {
    const [existingClient] = await db
      .select({ id: client.id })
      .from(client)
      .where(and(eq(client.orgId, orgId), eq(client.name, clientSeed.name)));
    const clientId =
      existingClient?.id ?? (await db.insert(client).values({ orgId, ...clientSeed }).returning({ id: client.id }))[0]!.id;

    const [existing] = await db
      .select({ id: engagement.id, name: engagement.name })
      .from(engagement)
      .where(and(eq(engagement.orgId, orgId), eq(engagement.name, e.name)));
    if (existing) return existing;
    const [created] = await db
      .insert(engagement)
      .values({ orgId, clientId, createdBy, ...e })
      .returning({ id: engagement.id, name: engagement.name });
    return created!;
  };
  const assign = (orgId: string, engagementId: string, userId: string, access: "edit" | "read") =>
    db.insert(engagementAssignment).values({ orgId, engagementId, userId, access }).onConflictDoNothing();

  const alice = ids["alice@acme.test"]!;
  const bob = ids["bob@beacon.test"]!;
  const carol = ids["carol@freelance.test"]!;

  const odoo = await ensureEngagement(
    acme.id,
    { name: "Harbour Foods Distribution", industry: "Distribution and wholesale", sizeBand: "medium" },
    { name: "Odoo 18 rollout", type: "packaged_software", targetSystem: "Odoo 18", targetGoLive: "2027-04-01" },
    alice,
  );
  await ensureEngagement(
    acme.id,
    { name: "Northline Fabrication", industry: "Manufacturing", sizeBand: "small" },
    { name: "Job costing off spreadsheets", type: "digitalisation", targetSystem: "Odoo 18 Manufacturing", targetGoLive: null },
    alice,
  );
  await ensureEngagement(
    beacon.id,
    { name: "Cebu Coastal Hotels", industry: "Hospitality and food service", sizeBand: "medium" },
    { name: "Finance platform migration", type: "platform_migration", targetSystem: "NetSuite", targetGoLive: "2027-01-15" },
    bob,
  );
  const intake = await ensureEngagement(
    beacon.id,
    { name: "Meridian Clinics", industry: "Healthcare", sizeBand: "small" },
    { name: "Patient intake automation", type: "automation", targetSystem: "Power Automate", targetGoLive: null },
    bob,
  );
  // Carol edits one Acme engagement and has read access to one Beacon engagement as a viewer.
  await assign(acme.id, odoo.id, carol, "edit");
  await assign(beacon.id, intake.id, carol, "read");

  // Project Essentials, stages and some chatter (phase 02b). Only filled in when still empty, and
  // chatter only added once, so re-running changes nothing.
  await db
    .update(engagement)
    .set({
      ocmStage: "develop",
      startDate: "2026-09-01",
      endDate: "2027-06-30",
      objectives: "Move order-to-cash and procurement onto Odoo 18 without losing a month-end close.",
      scopeSummary: "Sales, purchasing, inventory and accounting at the Manila and Cebu sites. Payroll is out of scope.",
      successCriteria: "Month-end close in five working days by the second close after go-live.",
      transitionOwner: "Harbour Foods finance operations",
    })
    .where(and(eq(engagement.id, odoo.id), isNull(engagement.objectives)));
  const [existingNote] = await db.select({ id: recordMessage.id }).from(recordMessage).where(eq(recordMessage.resId, odoo.id)).limit(1);
  if (!existingNote) {
    const target = { orgId: acme.id, engagementId: odoo.id, resType: "engagement", resId: odoo.id } as const;
    await db.insert(recordMessage).values([
      { ...target, kind: "note", authorUserId: alice, body: "Kick-off held with the finance manager. Sponsor confirmed." },
      {
        ...target,
        kind: "tracking",
        authorUserId: carol,
        tracking: [{ field: "ocmStage", label: "Stage", old: "Assess", new: "Develop" }],
      },
    ]);
  }

  // A drafted readiness assessment on the Odoo rollout (phase 03), from the packaged-software
  // template. The templates normally arrive with `pnpm db:migrate`; syncing here is a no-op then.
  await syncSystemTemplates(db);
  const [existingInstrument] = await db.select({ id: instrument.id }).from(instrument).where(eq(instrument.engagementId, odoo.id)).limit(1);
  if (!existingInstrument) {
    const [template] = await db
      .select()
      .from(instrumentTemplate)
      .where(
        and(
          isNull(instrumentTemplate.orgId),
          eq(instrumentTemplate.engagementType, "packaged_software"),
          eq(instrumentTemplate.version, TEMPLATE_VERSION),
        ),
      );
    if (!template) throw new Error("The packaged-software readiness template is missing.");
    await db.transaction((tx) =>
      createInstrumentFromDefinition(
        tx,
        { orgId: acme.id, engagementId: odoo.id },
        { name: "Readiness assessment", kind: "readiness", templateId: template.id, createdBy: alice, waveLabel: "Baseline" },
        definitionSchema.parse(template.definition),
      ),
    );
  }

  // People to ask (phase 04): the Odoo rollout's assessment is a draft, so nobody is emailed until a
  // consultant opens it. Addresses are on a reserved test domain.
  const [seededInstrument] = await db.select({ id: instrument.id }).from(instrument).where(eq(instrument.engagementId, odoo.id)).limit(1);
  if (seededInstrument) {
    const people = [
      ["Grace Okafor", "Finance", "AP clerk", "frontline"],
      ["Tom Reyes", "Finance", "Finance manager", "manager"],
      ["Priya Nair", "Finance", "Accountant", "frontline"],
      ["Sam Whitfield", "Warehouse", "Stores lead", "supervisor"],
      ["Lena Fischer", "Warehouse", "Picker", "frontline"],
      ["Marco Bianchi", "Warehouse", "Picker", "frontline"],
      ["Ade Bello", "Sales", "Sales coordinator", "frontline"],
      ["Ruth Kaplan", "Operations", "Operations director", "executive"],
    ] as const;
    await db
      .insert(respondent)
      .values(
        people.map(([name, department, roleTitle, seniority]) => ({
          orgId: acme.id,
          engagementId: odoo.id,
          instrumentId: seededInstrument.id,
          name,
          email: `${name.split(" ")[0]!.toLowerCase()}@harbourfoods.test`,
          department,
          roleTitle,
          seniority,
        })),
      )
      .onConflictDoNothing();
  }

  // A pending invitation, so the members page and the accept flow have something to show. The
  // token is stored only as a hash, so a re-run replaces the invitation and prints a fresh link.
  const inviteeEmail = "dave@newhire.test";
  const alreadyMember = await db.execute(sql`
    select 1 from membership m join auth.users u on u.id = m.user_id
    where m.org_id = ${acme.id} and u.email = ${inviteeEmail}
  `);
  const token = alreadyMember.length ? null : generateInvitationToken();
  if (token) {
    await db
      .delete(invitation)
      .where(and(eq(invitation.orgId, acme.id), eq(invitation.email, inviteeEmail), isNull(invitation.acceptedAt)));
    await db.insert(invitation).values({
      orgId: acme.id,
      email: inviteeEmail,
      role: "consultant",
      tokenHash: hashInvitationToken(token),
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      invitedBy: ids["alice@acme.test"]!,
    });
  }

  await connection.end();
  console.log(`Seeded. Sign in with any of these, password "${PASSWORD}":`);
  console.log(`  alice@acme.test       owner of ${acme.name} (/${acme.slug})`);
  console.log(`  bob@beacon.test       owner of ${beacon.name} (/${beacon.slug})`);
  console.log(`  carol@freelance.test  consultant at ${acme.name} (edits "${odoo.name}"),`);
  console.log(`                        viewer at ${beacon.name} (reads "${intake.name}")`);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  console.log(
    token
      ? `Pending invitation for ${inviteeEmail} (consultant at ${acme.name}): ${appUrl}/invite/${token}`
      : `${inviteeEmail} has already accepted their invitation to ${acme.name}.`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
