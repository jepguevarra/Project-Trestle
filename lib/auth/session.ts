import "server-only";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { RlsClaims } from "@/lib/db/rls";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** The signed-in user, verified with Supabase Auth (not just decoded from the cookie). */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function claimsFor(user: Pick<User, "id" | "email">): RlsClaims {
  return { sub: user.id, email: user.email ?? null };
}
