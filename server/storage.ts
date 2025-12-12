import { bookings, users, stripeSettings, type Booking, type InsertBooking, type User, type InsertUser, type StripeSettings } from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull } from "drizzle-orm";
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
  
  // Chat/booking lookup methods
  getBookingByEmail(email: string): Promise<Booking | undefined>;
  getBookingByPhone(phone: string): Promise<Booking | undefined>;
  rescheduleBooking(id: number, newDate: string, newTime: string): Promise<Booking | undefined>;
  cancelBooking(id: number, reason?: string): Promise<Booking | undefined>;
  
  createUser(user: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  
  getStripeSettings(): Promise<StripeSettings | null>;
  updateStripeSettings(accountId: string, status: string, email?: string): Promise<StripeSettings>;
  
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
    // Normalize phone number (remove non-digits)
    const normalizedPhone = phone.replace(/\D/g, "");
    const results = await db.select().from(bookings);
    // Find bookings with matching phone (normalized comparison)
    const matches = results.filter(b => 
      b.phone?.replace(/\D/g, "") === normalizedPhone
    );
    if (matches.length === 0) return undefined;
    return matches.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )[0];
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
}

export const storage = new DatabaseStorage();
