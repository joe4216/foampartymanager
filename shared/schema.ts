import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, serial, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  email: text("email"),
});

export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  used: boolean("used").default(false),
});

export const stripeSettings = pgTable("stripe_settings", {
  id: serial("id").primaryKey(),
  stripeAccountId: text("stripe_account_id"),
  stripeAccountStatus: text("stripe_account_status").default("not_connected"),
  stripeAccountEmail: text("stripe_account_email"),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  stripeSessionId: text("stripe_session_id"),
  amountPaid: integer("amount_paid"),
  // Venmo payment tracking fields
  paymentMethod: text("payment_method").default("stripe"), // "stripe" or "venmo"
  expectedAmount: integer("expected_amount"), // Amount in cents we expect to receive
  receivedAmount: integer("received_amount"), // Amount in cents actually received (from AI scan)
  receiptImageUrl: text("receipt_image_url"), // URL to uploaded Venmo screenshot
  paymentVerified: boolean("payment_verified").default(false), // Whether payment has been verified
  verifiedAt: timestamp("verified_at"), // When payment was verified
  verificationNotes: text("verification_notes"), // Notes about verification (auto-verified, mismatch, etc.)
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
export type StripeSettings = typeof stripeSettings.$inferSelect;
export type VerificationCode = typeof verificationCodes.$inferSelect;
