import Link from "next/link";
import { Table, Td, Th } from "@/components/ui/table";
import { ENGAGEMENT_TYPE_LABELS, type EngagementType } from "@/lib/validation/engagements";

type Row = {
  id: string;
  name: string;
  type: EngagementType;
  targetSystem: string;
  targetGoLive: string | null;
  status: "active" | "archived";
  clientId: string;
  clientName: string;
};

export function EngagementTable({
  orgSlug,
  rows,
  showClient = true,
  showStatus = false,
}: {
  orgSlug: string;
  rows: Row[];
  showClient?: boolean;
  showStatus?: boolean;
}) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Engagement</Th>
          {showClient ? <Th>Client</Th> : null}
          <Th>Type</Th>
          <Th>System</Th>
          <Th>Target go-live</Th>
          {showStatus ? <Th>Status</Th> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((e) => (
          <tr key={e.id}>
            <Td>
              <Link href={`/${orgSlug}/engagements/${e.id}` as never} className="text-primary underline-offset-4 hover:underline">
                {e.name}
              </Link>
            </Td>
            {showClient ? (
              <Td>
                <Link href={`/${orgSlug}/clients/${e.clientId}` as never} className="underline-offset-4 hover:underline">
                  {e.clientName}
                </Link>
              </Td>
            ) : null}
            <Td>{ENGAGEMENT_TYPE_LABELS[e.type]}</Td>
            <Td>{e.targetSystem}</Td>
            <Td className="tabular-nums whitespace-nowrap">{e.targetGoLive ?? "—"}</Td>
            {showStatus ? <Td>{e.status === "archived" ? "Archived" : "Active"}</Td> : null}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
