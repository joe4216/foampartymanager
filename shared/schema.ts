import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  partySize: integer("party_size").notNull(),
  packageType: text("package_type").notNull(),
  eventDate: text("event_date").notNull(),
  eventTime: text("event_time").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const bookingStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type BookingStatus = z.infer<typeof bookingStatusSchema>;
