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
      
      const stripeSettings = await storage.getStripeSettings();
      const connectedAccountId = stripeSettings?.stripeAccountStatus === 'active' 
        ? stripeSettings.stripeAccountId 
        : null;
      
      const sessionParams: any = {
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
      };

      if (connectedAccountId) {
        sessionParams.payment_intent_data = {
          transfer_data: {
            destination: connectedAccountId,
          },
        };
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      await storage.updateBookingStripeSession(booking.id, session.id);

      res.json({ url: session.url, bookingId: booking.id });
    } catch (error) {
      console.error("Checkout session error:", error);
      res.status(400).json({ error: "Failed to create checkout session" });
    }
  });

  // Venmo booking endpoint - creates booking with Venmo payment method
  app.post("/api/create-venmo-booking", async (req, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      const packageInfo = PACKAGE_PRICES[validatedData.packageType];
      
      if (!packageInfo) {
        res.status(400).json({ error: "Invalid package type" });
        return;
      }

      // Create booking with Venmo payment note and special status marker
      const bookingWithNote = {
        ...validatedData,
        notes: validatedData.notes 
          ? `${validatedData.notes}\n\n[VENMO PAYMENT - Awaiting payment to @joe4216]`
          : "[VENMO PAYMENT - Awaiting payment to @joe4216]"
      };
      
      const booking = await storage.createBooking(bookingWithNote);
      
      // Update status to indicate awaiting Venmo payment (distinct from card pending)
      await storage.updateBookingStatus(booking.id, "pending");
      
      // Return booking info with amount in dollars for Venmo redirect
      // Note: We store amountPaid as null until owner confirms Venmo payment
      const amountInDollars = packageInfo.amount / 100;
      res.json({ 
        bookingId: booking.id, 
        amount: amountInDollars,
        amountCents: packageInfo.amount,
        packageName: packageInfo.name,
        eventDate: validatedData.eventDate,
        eventTime: validatedData.eventTime,
        email: validatedData.email,
        success: true 
      });
    } catch (error) {
      console.error("Venmo booking error:", error);
      res.status(400).json({ error: "Failed to create Venmo booking" });
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

  app.get("/api/stripe/settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const settings = await storage.getStripeSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to get Stripe settings" });
    }
  });

  app.post("/api/stripe/connect/onboard", async (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const stripe = await getUncachableStripeClient();
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      let settings = await storage.getStripeSettings();
      let accountId = settings?.stripeAccountId;
      
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });
        accountId = account.id;
        await storage.updateStripeSettings(accountId, 'pending');
      }
      
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/owner/payments?refresh=true`,
        return_url: `${baseUrl}/owner/payments?success=true`,
        type: 'account_onboarding',
      });
      
      res.json({ url: accountLink.url });
    } catch (error: any) {
      console.error("Stripe Connect onboard error:", error);
      
      if (error?.message?.includes("signed up for Connect")) {
        res.status(400).json({ 
          error: "Stripe Connect not enabled",
          message: "Your Stripe account needs to have Connect enabled. Please visit your Stripe Dashboard and enable Connect to use this feature."
        });
        return;
      }
      
      res.status(500).json({ error: "Failed to create onboarding link" });
    }
  });

  app.post("/api/stripe/connect/refresh", async (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const settings = await storage.getStripeSettings();
      
      if (!settings?.stripeAccountId) {
        res.json({ status: 'not_connected' });
        return;
      }
      
      const stripe = await getUncachableStripeClient();
      const account = await stripe.accounts.retrieve(settings.stripeAccountId);
      
      let status = 'pending';
      if (account.charges_enabled && account.payouts_enabled) {
        status = 'active';
      } else if (account.details_submitted) {
        status = 'pending_verification';
      }
      
      await storage.updateStripeSettings(
        settings.stripeAccountId, 
        status, 
        account.email || undefined
      );
      
      const updatedSettings = await storage.getStripeSettings();
      res.json(updatedSettings);
    } catch (error) {
      console.error("Stripe Connect refresh error:", error);
      res.status(500).json({ error: "Failed to refresh account status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
