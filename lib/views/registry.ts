import { z } from "zod";

/**
 * Every model that has chatter, as stored in `record_message.res_type`. A closed list: the database
 * mirrors it with a CHECK constraint (drizzle/0002_view_kit.sql), and every write is validated here
 * first. Add a model in both places, in the same commit.
 */
export const RES_TYPES = ["client", "engagement"] as const;
export type ResType = (typeof RES_TYPES)[number];
export const resTypeSchema = z.enum(RES_TYPES);
