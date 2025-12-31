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
  // Email verification for customers
  emailVerified: boolean("email_verified").default(false),
  emailVerificationCode: text("email_verification_code"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  // Confirmation number (generated after successful payment)
  confirmationNumber: text("confirmation_number"),
  createdAt: timestamp("created_at").defaultNow(),
  // Abandoned booking recovery fields
  pendingExpiresAt: timestamp("pending_expires_at"), // When pending booking expires (3 days after creation)
  reminderSentAt: timestamp("reminder_sent_at"), // When reminder email was sent (day 2, 24hrs before expiry)
  cancelNote: text("cancel_note"), // Note explaining cancellation reason
  // Distance-based pricing fields
  distanceMiles: integer("distance_miles"), // Distance from base address in miles
  travelFee: integer("travel_fee"), // Travel fee in cents (0 if within 20 miles)
});

export const newsFeedEvents = pgTable("news_feed_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  date: text("date").notNull(),
  location: text("location").notNull(),
  attendees: text("attendees").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  likes: integer("likes").default(0),
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

export const insertNewsFeedEventSchema = createInsertSchema(newsFeedEvents).omit({
  id: true,
  createdAt: true,
  likes: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type BookingStatus = z.infer<typeof bookingStatusSchema>;
export type StripeSettings = typeof stripeSettings.$inferSelect;
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type NewsFeedEvent = typeof newsFeedEvents.$inferSelect;
export type InsertNewsFeedEvent = z.infer<typeof insertNewsFeedEventSchema>;
