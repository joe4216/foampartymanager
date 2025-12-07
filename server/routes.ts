import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookingSchema, bookingStatusSchema } from "@shared/schema";
import { setupAuth } from "./auth";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

const PACKAGE_PRICES: Record<string, { name: string; amount: number }> = {
  "standard-30min": { name: "Standard Foam Party - 30 minutes", amount: 20000 },
  "standard-1hr": { name: "Standard Foam Party - 1 hour", amount: 32500 },
  "standard-2hr": { name: "Standard Foam Party - 2 hours", amount: 43000 },
  "glow-30min": { name: "Glow Foam Add-on - 30 minutes", amount: 12500 },
  "glow-1hr": { name: "Glow Foam Add-on - 1 hour", amount: 20000 },
  "gender-reveal-30min": { name: "Gender Reveal Party - 30 minutes", amount: 30000 },
  "gender-reveal-1hr": { name: "Gender Reveal Party - 1 hour", amount: 47500 },
};

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  app.post("/api/bookings", async (req, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      const booking = await storage.createBooking(validatedData);
      res.json(booking);
    } catch (error) {
      res.status(400).json({ error: "Invalid booking data" });
    }
  });

  app.get("/api/bookings", async (req, res) => {
    try {
      const bookings = await storage.getBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      if (!booking) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }
      res.json(booking);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch booking" });
    }
  });

  app.patch("/api/bookings/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = bookingStatusSchema.parse(req.body);

      const booking = await storage.updateBookingStatus(id, validatedData.status);
      if (!booking) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }
      res.json(booking);
    } catch (error) {
      res.status(400).json({ error: "Invalid status value" });
    }
  });

  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      res.status(500).json({ error: "Failed to get Stripe key" });
    }
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      const packageInfo = PACKAGE_PRICES[validatedData.packageType];
      
      if (!packageInfo) {
        res.status(400).json({ error: "Invalid package type" });
        return;
      }

      const booking = await storage.createBooking(validatedData);

      const stripe = await getUncachableStripeClient();
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: packageInfo.name,
              description: `Event Date: ${validatedData.eventDate} at ${validatedData.eventTime}`,
            },
            unit_amount: packageInfo.amount,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/booking-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`,
        cancel_url: `${baseUrl}/booking-cancelled?booking_id=${booking.id}`,
        customer_email: validatedData.email,
        metadata: {
          bookingId: booking.id.toString(),
        },
      });

      await storage.updateBookingStripeSession(booking.id, session.id);

      res.json({ url: session.url, bookingId: booking.id });
    } catch (error) {
      console.error("Checkout session error:", error);
      res.status(400).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/verify-payment", async (req, res) => {
    try {
      const { sessionId, bookingId } = req.body;
      
      if (!sessionId || !bookingId) {
        res.status(400).json({ error: "Missing session ID or booking ID" });
        return;
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === 'paid') {
        const booking = await storage.updateBookingPayment(
          parseInt(bookingId),
          sessionId,
          session.amount_total || 0
        );
        res.json({ success: true, booking });
      } else {
        res.status(400).json({ error: "Payment not completed" });
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({ error: "Failed to verify payment" });
    }
  });

  app.delete("/api/bookings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }

      if (booking.status === "pending") {
        await storage.updateBookingStatus(id, "cancelled");
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel booking" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
