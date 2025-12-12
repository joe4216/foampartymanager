import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookingSchema, bookingStatusSchema } from "@shared/schema";
import { setupAuth } from "./auth";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { analyzeVenmoReceipt, processChatMessage } from "./openai";
import fs from "fs";
import path from "path";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

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

      // Create booking with Venmo payment note
      const bookingWithNote = {
        ...validatedData,
        notes: validatedData.notes 
          ? `${validatedData.notes}\n\n[VENMO PAYMENT - Awaiting payment to @joe4216]`
          : "[VENMO PAYMENT - Awaiting payment to @joe4216]"
      };
      
      // Use the new Venmo-specific storage method
      const booking = await storage.createVenmoBooking(bookingWithNote, packageInfo.amount);
      
      // Return booking info with amount in dollars for Venmo redirect
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

  // Upload Venmo receipt and analyze with AI
  app.post("/api/venmo/upload-receipt", (req, res, next) => {
    upload.single("receipt")(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.json({ success: false, message: "Image too large. Maximum size is 10MB." });
          }
          return res.json({ success: false, message: `Upload error: ${err.message}` });
        }
        return res.json({ success: false, message: err.message || "Upload failed" });
      }
      next();
    });
  }, async (req, res) => {
    try {
      const bookingId = req.body.bookingId;
      const file = req.file;
      
      if (!bookingId || !file) {
        res.json({ success: false, message: "Missing booking ID or image" });
        return;
      }

      const booking = await storage.getBooking(parseInt(bookingId));
      if (!booking) {
        res.json({ success: false, message: "Booking not found" });
        return;
      }

      if (booking.paymentMethod !== "venmo") {
        res.json({ success: false, message: "This booking is not a Venmo payment" });
        return;
      }

      // Validate booking is still pending verification
      if (booking.paymentVerified) {
        res.json({ success: false, message: "This booking has already been verified" });
        return;
      }

      const imageBuffer = file.buffer;
      
      // Convert buffer to base64 for AI analysis BEFORE saving
      const imageBase64 = imageBuffer.toString("base64");

      // Analyze the receipt with AI - check if it's a valid Venmo receipt
      let analysis;
      try {
        analysis = await analyzeVenmoReceipt(imageBase64, "joe");
      } catch (aiError) {
        console.error("AI analysis error:", aiError);
        res.json({
          success: false,
          verified: false,
          message: "Could not analyze the image. Please try again or contact the owner.",
        });
        return;
      }
      
      // Check if it's a valid Venmo receipt - don't save invalid receipts
      if (!analysis.isVenmoReceipt) {
        res.json({
          success: false,
          verified: false,
          message: "This doesn't appear to be a valid Venmo payment screenshot. Please upload a screenshot showing your completed Venmo payment to @joe4216.",
        });
        return;
      }

      // Check if the recipient matches - don't save wrong recipient receipts
      if (!analysis.recipientMatch) {
        res.json({
          success: false,
          verified: false,
          message: "This payment doesn't appear to be made to @joe4216. Please upload a screenshot of your payment to the correct Venmo account.",
        });
        return;
      }
      
      // Valid Venmo receipt - now save the file
      const uploadsDir = path.join(process.cwd(), "uploads", "receipts");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const extension = file.mimetype === "image/png" ? "png" : "jpg";
      const sanitizedBookingId = String(bookingId).replace(/[^0-9]/g, "");
      const fileName = `venmo-receipt-${sanitizedBookingId}-${Date.now()}.${extension}`;
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, imageBuffer);
      
      const receiptUrl = `/uploads/receipts/${fileName}`;
      await storage.updateVenmoReceipt(booking.id, receiptUrl);
      
      if (analysis.error || analysis.amount === null) {
        // Update booking with pending status for manual review
        await storage.verifyVenmoPayment(
          booking.id,
          0,
          false,
          "Valid Venmo receipt but could not detect amount - needs manual verification"
        );
        
        res.json({
          success: true,
          receiptUrl,
          verified: false,
          pendingReview: true,
          message: "Receipt uploaded! We couldn't automatically detect the amount. The owner will verify and confirm your booking shortly.",
        });
        return;
      }

      // Convert AI-detected amount to cents
      const receivedAmountCents = Math.round(analysis.amount * 100);
      const expectedAmountCents = booking.expectedAmount || 0;
      
      // Check if amounts match (within $1 tolerance for rounding)
      const amountsMatch = Math.abs(receivedAmountCents - expectedAmountCents) <= 100;

      // Only auto-verify if amounts match AND confidence is high
      if (amountsMatch && analysis.confidence === "high") {
        await storage.verifyVenmoPayment(
          booking.id, 
          receivedAmountCents, 
          true, 
          "Auto-verified: Valid Venmo receipt with matching amount"
        );
        
        res.json({
          success: true,
          receiptUrl,
          verified: true,
          message: "Payment verified! Your booking is now confirmed.",
          bookingId: booking.id,
        });
      } else {
        // Flag for manual review
        const notes = amountsMatch 
          ? `Valid Venmo receipt, low confidence - needs manual verification (detected $${analysis.amount.toFixed(2)})`
          : `Valid Venmo receipt, amount mismatch: Expected $${(expectedAmountCents / 100).toFixed(2)}, detected $${analysis.amount.toFixed(2)}`;
        
        await storage.verifyVenmoPayment(
          booking.id,
          receivedAmountCents,
          false,
          notes
        );

        res.json({
          success: true,
          receiptUrl,
          verified: false,
          pendingReview: true,
          detectedAmount: analysis.amount,
          expectedAmount: expectedAmountCents / 100,
          message: "Receipt uploaded! The amount needs verification. The owner will confirm your booking shortly.",
        });
      }
    } catch (error) {
      console.error("Receipt upload error:", error);
      res.json({ success: false, message: "Something went wrong processing your receipt. Please try again or contact the owner." });
    }
  });

  // Serve uploaded receipts
  app.use("/uploads", (await import("express")).default.static(path.join(process.cwd(), "uploads")));

  // Get pending Venmo payments for owner dashboard
  app.get("/api/venmo/pending", async (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const pendingBookings = await storage.getPendingVenmoBookings();
      res.json(pendingBookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending Venmo payments" });
    }
  });

  // Manually verify Venmo payment (owner action)
  app.post("/api/venmo/verify", async (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const { bookingId, receivedAmount, verified, notes } = req.body;
      
      if (!bookingId) {
        res.status(400).json({ error: "Missing booking ID" });
        return;
      }

      // Convert dollars to cents
      const amountCents = receivedAmount ? Math.round(parseFloat(receivedAmount) * 100) : 0;
      
      const booking = await storage.verifyVenmoPayment(
        parseInt(bookingId),
        amountCents,
        verified === true,
        notes || (verified ? "Manually verified by owner" : "Rejected by owner")
      );

      if (!booking) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }

      res.json({ success: true, booking });
    } catch (error) {
      console.error("Manual verification error:", error);
      res.status(500).json({ error: "Failed to verify payment" });
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

  // Chatbot endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, sessionBookingId, sessionPhone, conversationHistory } = req.body;
      
      if (!message) {
        res.status(400).json({ error: "Message is required" });
        return;
      }

      // Try to find booking if we already have a verified session
      let booking = undefined;
      if (sessionBookingId) {
        booking = await storage.getBooking(parseInt(sessionBookingId));
      }

      // Process the message with AI
      const aiResponse = await processChatMessage(message, {
        booking,
        conversationHistory: conversationHistory || [],
      });

      // Handle verification flow
      let responseBooking = booking;
      let actions: string[] = [];
      let needsNameVerification = false;
      let multipleBookingsPhone = "";

      // Step 1: Check for booking ID
      if (aiResponse.extractedBookingId && !booking) {
        const bookingId = parseInt(aiResponse.extractedBookingId);
        if (!isNaN(bookingId)) {
          responseBooking = await storage.getBooking(bookingId);
        }
      }

      // Step 2: Check for phone number if no booking found yet
      if (aiResponse.extractedPhone && !responseBooking) {
        const phoneBookings = await storage.getBookingsByPhone(aiResponse.extractedPhone);
        
        if (phoneBookings.length === 1) {
          // Single booking found - verified!
          responseBooking = phoneBookings[0];
        } else if (phoneBookings.length > 1) {
          // Multiple bookings - need name to disambiguate
          needsNameVerification = true;
          multipleBookingsPhone = aiResponse.extractedPhone;
          
          // Check if we also have a name to filter
          if (aiResponse.extractedName) {
            const nameMatches = await storage.getBookingsByPhoneAndName(
              aiResponse.extractedPhone, 
              aiResponse.extractedName
            );
            if (nameMatches.length === 1) {
              responseBooking = nameMatches[0];
              needsNameVerification = false;
            } else if (nameMatches.length > 1) {
              // Still multiple - use most recent
              responseBooking = nameMatches[0];
              needsNameVerification = false;
            }
          }
        }
      }

      // Step 3: Check for name verification with stored phone
      if (aiResponse.extractedName && sessionPhone && !responseBooking) {
        const nameMatches = await storage.getBookingsByPhoneAndName(sessionPhone, aiResponse.extractedName);
        if (nameMatches.length >= 1) {
          responseBooking = nameMatches[0];
        }
      }

      // Determine actions and message based on booking state
      let responseMessage = aiResponse.message;
      let showUploadPrompt = false;
      
      if (responseBooking) {
        const isPaid = responseBooking.status === "confirmed";
        
        if (responseBooking.status === "cancelled") {
          actions = ["Contact Owner", "Book New Party"];
        } else if (isPaid) {
          actions = ["Reschedule", "Cancel Booking", "Contact Owner"];
        } else {
          // Payment pending - show verification options
          // Check if user clicked "Verify Payment"
          if (message === "Verify Payment") {
            responseMessage = "Please upload a screenshot of your Venmo payment to @joe4216. Make sure the screenshot shows:\n\n• The Venmo payment confirmation\n• The correct amount you paid\n• The date of payment\n\nClick the paperclip button below to upload your screenshot.";
            showUploadPrompt = true;
            actions = ["Cancel Booking", "Contact Owner"];
          } else {
            // First time seeing pending payment
            responseMessage = `I found your booking! Looks like your payment is still pending. I can verify your payment for you.\n\n📦 Package: ${responseBooking.packageType}\n📅 Date: ${responseBooking.eventDate}\n⏰ Time: ${responseBooking.eventTime}\n💰 Status: Payment Pending\n\nHow would you like to proceed?`;
            actions = ["Verify Payment", "Cancel Booking", "Contact Owner"];
          }
        }

        // Handle reschedule intent if payment is confirmed
        if (aiResponse.intent === "reschedule" && aiResponse.newDate && aiResponse.newTime) {
          if (isPaid) {
            await storage.rescheduleBooking(responseBooking.id, aiResponse.newDate, aiResponse.newTime);
            responseBooking = await storage.getBooking(responseBooking.id);
          }
        }

        // Handle cancel intent
        if (aiResponse.intent === "cancel" && responseBooking) {
          const bookingIdToCancel = responseBooking.id;
          if (message.toLowerCase().includes("yes") || message.toLowerCase().includes("confirm")) {
            await storage.cancelBooking(bookingIdToCancel, "Cancelled via chat");
            responseBooking = await storage.getBooking(bookingIdToCancel);
          } else {
            actions = ["Yes, Cancel My Booking", "No, Keep My Booking"];
          }
        }
      } else if (needsNameVerification) {
        actions = ["I don't have my booking number"];
      } else if (aiResponse.intent !== "general_info" && aiResponse.intent !== "greeting") {
        actions = ["I have my booking number", "I don't have my booking number", "Contact Owner"];
      }

      res.json({
        message: responseMessage,
        bookingInfo: responseBooking ? {
          id: responseBooking.id,
          customerName: responseBooking.customerName,
          email: responseBooking.email,
          phone: responseBooking.phone,
          packageType: responseBooking.packageType,
          eventDate: responseBooking.eventDate,
          eventTime: responseBooking.eventTime,
          status: responseBooking.status,
          isPaid: responseBooking.status === "confirmed",
        } : undefined,
        actions,
        sessionVerified: !!responseBooking,
        needsNameVerification,
        sessionPhone: multipleBookingsPhone || sessionPhone,
        showUploadPrompt,
      });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
