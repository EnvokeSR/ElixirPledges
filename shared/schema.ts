import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const pledges = pgTable("pledges", {
  id: serial("id").primaryKey(),
  pledgeCode: text("pledge_code").notNull().unique(),
  pledgeText: text("pledge_text").notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  grade: text("grade").notNull(),
  pledgeCode: text("pledge_code").notNull(),
  favoriteCelebrity: text("favorite_celebrity"),
  videoSubmitted: boolean("video_submitted").default(false),
  url: text("url"),
});

// Create insert schemas
export const insertPledgeSchema = createInsertSchema(pledges).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });

// Export types
export type InsertPledge = z.infer<typeof insertPledgeSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Pledge = typeof pledges.$inferSelect;
export type User = typeof users.$inferSelect;