import { bookings, users, stripeSettings, verificationCodes, type Booking, type InsertBooking, type User, type InsertUser, type StripeSettings, type VerificationCode } from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull, gt } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookings(): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingByStripeSession(sessionId: string): Promise<Booking | undefined>;
  updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;
  updateBookingStripeSession(id: number, stripeSessionId: string): Promise<Booking | undefined>;
  updateBookingPayment(id: number, stripeSessionId: string, amountPaid: number): Promise<Booking | undefined>;
  
  // Venmo payment methods
  createVenmoBooking(booking: InsertBooking, expectedAmount: number): Promise<Booking>;
  updateVenmoReceipt(id: number, receiptImageUrl: string): Promise<Booking | undefined>;
  verifyVenmoPayment(id: number, receivedAmount: number, verified: boolean, notes: string): Promise<Booking | undefined>;
  getPendingVenmoBookings(): Promise<Booking[]>;
  updateBookingForVenmo(id: number, expectedAmount: number, notes: string): Promise<Booking | undefined>;
  
  // Chat/booking lookup methods
  getBookingByEmail(email: string): Promise<Booking | undefined>;
  getBookingByPhone(phone: string): Promise<Booking | undefined>;
  getBookingsByPhone(phone: string): Promise<Booking[]>;
  getBookingsByPhoneAndName(phone: string, name: string): Promise<Booking[]>;
  rescheduleBooking(id: number, newDate: string, newTime: string): Promise<Booking | undefined>;
  cancelBooking(id: number, reason?: string): Promise<Booking | undefined>;
  
  createUser(user: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<User | undefined>;
  
  getStripeSettings(): Promise<StripeSettings | null>;
  updateStripeSettings(accountId: string, status: string, email?: string): Promise<StripeSettings>;
  
  // Verification code methods
  createVerificationCode(userId: number, code: string, expiresAt: Date): Promise<VerificationCode>;
  getValidVerificationCode(userId: number, code: string): Promise<VerificationCode | undefined>;
  markVerificationCodeUsed(id: number): Promise<void>;
  updateUserEmail(userId: number, email: string): Promise<User | undefined>;
  
  // Booking email verification methods
  setBookingEmailVerification(id: number, code: string, expiresAt: Date): Promise<Booking | undefined>;
  verifyBookingEmail(id: number): Promise<Booking | undefined>;
  getBookingByEmailVerificationCode(email: string, code: string): Promise<Booking | undefined>;
  setBookingConfirmationNumber(id: number, confirmationNumber: string): Promise<Booking | undefined>;
  
  // Abandoned booking recovery methods
  setPendingExpiry(id: number, expiresAt: Date): Promise<Booking | undefined>;
  getPendingBookingsNeedingReminder1(): Promise<Booking[]>;
  getPendingBookingsNeedingReminder2(): Promise<Booking[]>;
  getExpiredPendingBookings(): Promise<Booking[]>;
  markReminder1Sent(id: number): Promise<Booking | undefined>;
  markReminder2Sent(id: number): Promise<Booking | undefined>;
  autoCancelBooking(id: number, note: string): Promise<Booking | undefined>;
  findPendingBookingByEmailOrPhone(email: string, phone: string): Promise<Booking | undefined>;
  
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const [booking] = await db
      .insert(bookings)
      .values(insertBooking)
      .returning();
    return booking;
  }

  async getBookings(): Promise<Booking[]> {
    return await db.select().from(bookings);
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async getBookingByStripeSession(sessionId: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.stripeSessionId, sessionId));
    return booking || undefined;
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ status })
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async updateBookingStripeSession(id: number, stripeSessionId: string): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ stripeSessionId })
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async updateBookingPayment(id: number, stripeSessionId: string, amountPaid: number): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ stripeSessionId, amountPaid, status: "confirmed" })
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async createVenmoBooking(insertBooking: InsertBooking, expectedAmount: number): Promise<Booking> {
    const [booking] = await db
      .insert(bookings)
      .values({
        ...insertBooking,
        paymentMethod: "venmo",
        expectedAmount,
        paymentVerified: false,
      })
      .returning();
    return booking;
  }

  async updateBookingForVenmo(id: number, expectedAmount: number, notes: string): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ 
        paymentMethod: "venmo",
        expectedAmount,
        paymentVerified: false,
        notes
      })
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async updateVenmoReceipt(id: number, receiptImageUrl: string): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ receiptImageUrl })
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async verifyVenmoPayment(id: number, receivedAmount: number, verified: boolean, notes: string): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ 
        receivedAmount,
        paymentVerified: verified,
        verifiedAt: verified ? new Date() : null,
        verificationNotes: notes,
        status: verified ? "confirmed" : "pending",
        amountPaid: verified ? receivedAmount : null,
      })
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async getPendingVenmoBookings(): Promise<Booking[]> {
    return await db.select().from(bookings).where(
      and(
        eq(bookings.paymentMethod, "venmo"),
        eq(bookings.paymentVerified, false)
      )
    );
  }

  async getBookingByEmail(email: string): Promise<Booking | undefined> {
    const results = await db.select().from(bookings).where(eq(bookings.email, email));
    // Return most recent booking
    if (results.length === 0) return undefined;
    return results.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )[0];
  }

  async getBookingByPhone(phone: string): Promise<Booking | undefined> {
    // Normalize phone number (remove non-digits, take last 10 digits)
    const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
    const results = await db.select().from(bookings);
    // Find bookings with matching phone (compare last 10 digits to handle country codes)
    const matches = results.filter(b => 
      b.phone?.replace(/\D/g, "").slice(-10) === normalizedPhone
    );
    if (matches.length === 0) return undefined;
    return matches.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )[0];
  }

  async getBookingsByPhone(phone: string): Promise<Booking[]> {
    // Normalize phone number (remove non-digits, take last 10 digits)
    const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
    const results = await db.select().from(bookings);
    // Find all bookings with matching phone (compare last 10 digits to handle country codes)
    return results.filter(b => 
      b.phone?.replace(/\D/g, "").slice(-10) === normalizedPhone
    ).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getBookingsByPhoneAndName(phone: string, name: string): Promise<Booking[]> {
    // Normalize phone number (remove non-digits, take last 10 digits)
    const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
    const normalizedName = name.toLowerCase().trim();
    const results = await db.select().from(bookings);
    // Find bookings matching phone AND name (case-insensitive)
    return results.filter(b => 
      b.phone?.replace(/\D/g, "").slice(-10) === normalizedPhone &&
      b.customerName?.toLowerCase().includes(normalizedName)
    ).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async rescheduleBooking(id: number, newDate: string, newTime: string): Promise<Booking | undefined> {
    const existing = await this.getBooking(id);
    const [booking] = await db
      .update(bookings)
      .set({ 
        eventDate: newDate, 
        eventTime: newTime,
        notes: existing?.notes 
          ? `${existing.notes}\n[Rescheduled to ${newDate} ${newTime}: ${new Date().toISOString()}]`
          : `[Rescheduled to ${newDate} ${newTime}: ${new Date().toISOString()}]`
      })
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async cancelBooking(id: number, reason?: string): Promise<Booking | undefined> {
    const existing = await this.getBooking(id);
    const [booking] = await db
      .update(bookings)
      .set({ 
        status: "cancelled",
        notes: existing?.notes 
          ? `${existing.notes}\n[Cancelled: ${reason || 'Customer request'} - ${new Date().toISOString()}]`
          : `[Cancelled: ${reason || 'Customer request'} - ${new Date().toISOString()}]`
      })
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async getStripeSettings(): Promise<StripeSettings | null> {
    const [settings] = await db.select().from(stripeSettings).limit(1);
    return settings || null;
  }

  async updateStripeSettings(accountId: string, status: string, email?: string): Promise<StripeSettings> {
    const existing = await this.getStripeSettings();
    
    if (existing) {
      const [updated] = await db
        .update(stripeSettings)
        .set({ 
          stripeAccountId: accountId, 
          stripeAccountStatus: status, 
          stripeAccountEmail: email,
          updatedAt: new Date()
        })
        .where(eq(stripeSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(stripeSettings)
        .values({ 
          stripeAccountId: accountId, 
          stripeAccountStatus: status, 
          stripeAccountEmail: email 
        })
        .returning();
      return created;
    }
  }

  async createVerificationCode(userId: number, code: string, expiresAt: Date): Promise<VerificationCode> {
    const [verificationCode] = await db
      .insert(verificationCodes)
      .values({ userId, code, expiresAt })
      .returning();
    return verificationCode;
  }

  async getValidVerificationCode(userId: number, code: string): Promise<VerificationCode | undefined> {
    const [verificationCode] = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.userId, userId),
          eq(verificationCodes.code, code),
          eq(verificationCodes.used, false),
          gt(verificationCodes.expiresAt, new Date())
        )
      );
    return verificationCode || undefined;
  }

  async markVerificationCodeUsed(id: number): Promise<void> {
    await db
      .update(verificationCodes)
      .set({ used: true })
      .where(eq(verificationCodes.id, id));
  }

  async updateUserEmail(userId: number, email: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ email })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async setBookingEmailVerification(id: number, code: string, expiresAt: Date): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ 
        emailVerificationCode: code,
        emailVerificationExpires: expiresAt,
        emailVerified: false
      })
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async verifyBookingEmail(id: number): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ 
        emailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpires: null
      })
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async getBookingByEmailVerificationCode(email: string, code: string): Promise<Booking | undefined> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.email, email),
          eq(bookings.emailVerificationCode, code),
          eq(bookings.emailVerified, false),
          gt(bookings.emailVerificationExpires, new Date())
        )
      );
    return booking || undefined;
  }

  async setBookingConfirmationNumber(id: number, confirmationNumber: string): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ confirmationNumber })
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async setPendingExpiry(id: number, expiresAt: Date): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ pendingExpiresAt: expiresAt })
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async getPendingBookingsNeedingReminder1(): Promise<Booking[]> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const results = await db.select().from(bookings).where(
      and(
        eq(bookings.status, "pending"),
        isNull(bookings.reminder1SentAt)
      )
    );
    
    return results.filter(b => {
      if (!b.createdAt) return false;
      const createdAt = new Date(b.createdAt);
      return createdAt <= oneDayAgo;
    });
  }

  async getPendingBookingsNeedingReminder2(): Promise<Booking[]> {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    
    const results = await db.select().from(bookings).where(
      and(
        eq(bookings.status, "pending"),
        isNull(bookings.reminder2SentAt)
      )
    );
    
    return results.filter(b => {
      if (!b.createdAt || !b.reminder1SentAt) return false;
      const createdAt = new Date(b.createdAt);
      return createdAt <= twoDaysAgo;
    });
  }

  async getExpiredPendingBookings(): Promise<Booking[]> {
    const now = new Date();
    
    const results = await db.select().from(bookings).where(
      eq(bookings.status, "pending")
    );
    
    return results.filter(b => {
      if (b.pendingExpiresAt) {
        return new Date(b.pendingExpiresAt) <= now;
      }
      if (!b.createdAt) return false;
      const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);
      return new Date(b.createdAt) <= threeDaysAgo;
    });
  }

  async markReminder1Sent(id: number): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ reminder1SentAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async markReminder2Sent(id: number): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ reminder2SentAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async autoCancelBooking(id: number, note: string): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ 
        status: "cancelled",
        cancelNote: note
      })
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async findPendingBookingByEmailOrPhone(email: string, phone: string): Promise<Booking | undefined> {
    const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
    
    const results = await db.select().from(bookings).where(
      eq(bookings.status, "pending")
    );
    
    const match = results.find(b => {
      const phoneMatch = b.phone?.replace(/\D/g, "").slice(-10) === normalizedPhone;
      const emailMatch = b.email?.toLowerCase() === email.toLowerCase();
      return emailMatch || phoneMatch;
    });
    
    return match;
  }
}

export const storage = new DatabaseStorage();
