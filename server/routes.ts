import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookingSchema, bookingStatusSchema, insertNewsFeedEventSchema, insertCalendarSubscriberSchema } from "@shared/schema";
import { setupAuth } from "./auth";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { analyzeVenmoReceipt, processChatMessage } from "./openai";
import fs from "fs";
import path from "path";
import multer from "multer";
import crypto from "crypto";

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

function generateConfirmationNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `FW-${part1}-${part2}`;
}

const PACKAGE_PRICES: Record<string, { name: string; amount: number }> = {
  "standard-30min": { name: "Standard Foam Party - 30 minutes", amount: 20000 },
  "standard-1hr": { name: "Standard Foam Party - 1 hour", amount: 32500 },
  "standard-2hr": { name: "Standard Foam Party - 2 hours", amount: 43000 },
  "glow-30min": { name: "Glow Foam Add-on - 30 minutes", amount: 12500 },
  "glow-1hr": { name: "Glow Foam Add-on - 1 hour", amount: 20000 },
  "gender-reveal-30min": { name: "Gender Reveal Party - 30 minutes", amount: 30000 },
  "gender-reveal-1hr": { name: "Gender Reveal Party - 1 hour", amount: 47500 },
};

// Base address for distance calculation
const BASE_ADDRESS = "78 Wright Rd, Guntersville, AL 35976";
const FREE_MILES = 20;
const PRICE_PER_MILE_CENTS = 200; // $2 per mile

// Geocode an address using Geoapify
async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    console.error("Missing GEOAPIFY_API_KEY");
    return null;
  }
  
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodedAddress}&apiKey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lon, lat] = data.features[0].geometry.coordinates;
      return { lat, lon };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

// Calculate driving distance using Geoapify Routing API
async function calculateDrivingDistance(
  fromLat: number, fromLon: number, 
  toLat: number, toLon: number
): Promise<number | null> {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    console.error("Missing GEOAPIFY_API_KEY");
    return null;
  }
  
  try {
    const url = `https://api.geoapify.com/v1/routing?waypoints=${fromLat},${fromLon}|${toLat},${toLon}&mode=drive&apiKey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      // Distance is returned in meters, convert to miles
      const distanceMeters = data.features[0].properties.distance;
      const distanceMiles = distanceMeters / 1609.344;
      return Math.round(distanceMiles * 10) / 10; // Round to 1 decimal
    }
    return null;
  } catch (error) {
    console.error("Routing error:", error);
    return null;
  }
}

// Calculate travel fee based on distance
function calculateTravelFee(distanceMiles: number): number {
  if (distanceMiles <= FREE_MILES) {
    return 0;
  }
  const extraMiles = Math.ceil(distanceMiles - FREE_MILES);
  return extraMiles * PRICE_PER_MILE_CENTS; // Returns cents
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Address autocomplete using Geoapify
  app.get("/api/address-autocomplete", async (req, res) => {
    try {
      const { text } = req.query;
      
      if (!text || typeof text !== 'string' || text.length < 3) {
        res.json({ suggestions: [] });
        return;
      }

      const apiKey = process.env.GEOAPIFY_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "Geocoding service unavailable" });
        return;
      }

      const encodedText = encodeURIComponent(text);
      const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodedText}&type=street&filter=countrycode:us&limit=5&apiKey=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const suggestions = data.features.map((feature: any) => ({
          formatted: feature.properties.formatted,
          streetAddress: feature.properties.address_line1 || feature.properties.street || '',
          city: feature.properties.city || feature.properties.town || feature.properties.village || '',
          state: feature.properties.state_code || feature.properties.state || '',
          zipCode: feature.properties.postcode || '',
          lat: feature.properties.lat,
          lon: feature.properties.lon
        })).filter((s: any) => s.streetAddress && s.city && s.state);
        
        res.json({ suggestions });
      } else {
        res.json({ suggestions: [] });
      }
    } catch (error) {
      console.error("Autocomplete error:", error);
      res.json({ suggestions: [] });
    }
  });

  // Calculate distance and travel fee from customer address
  app.post("/api/calculate-distance", async (req, res) => {
    try {
      const { address } = req.body;
      
      if (!address) {
        res.status(400).json({ error: "Address is required" });
        return;
      }

      // Geocode both addresses
      const [baseCoords, customerCoords] = await Promise.all([
        geocodeAddress(BASE_ADDRESS),
        geocodeAddress(address)
      ]);

      if (!baseCoords) {
        res.status(500).json({ error: "Could not geocode base address" });
        return;
      }

      if (!customerCoords) {
        res.status(400).json({ 
          error: "Could not find the address. Please check and try again.",
          distanceMiles: null,
          travelFeeCents: 0,
          travelFeeDollars: 0
        });
        return;
      }

      // Calculate driving distance
      const distanceMiles = await calculateDrivingDistance(
        baseCoords.lat, baseCoords.lon,
        customerCoords.lat, customerCoords.lon
      );

      if (distanceMiles === null) {
        res.status(500).json({ 
          error: "Could not calculate driving distance",
          distanceMiles: null,
          travelFeeCents: 0,
          travelFeeDollars: 0
        });
        return;
      }

      const travelFeeCents = calculateTravelFee(distanceMiles);
      const travelFeeDollars = travelFeeCents / 100;

      res.json({
        distanceMiles,
        travelFeeCents,
        travelFeeDollars,
        freeMiles: FREE_MILES,
        extraMiles: distanceMiles > FREE_MILES ? Math.ceil(distanceMiles - FREE_MILES) : 0,
        pricePerMile: PRICE_PER_MILE_CENTS / 100
      });
    } catch (error) {
      console.error("Distance calculation error:", error);
      res.status(500).json({ error: "Failed to calculate distance" });
    }
  });

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

  // Lookup pending booking by email or phone for returning customers
  app.post("/api/bookings/lookup-pending", async (req, res) => {
    try {
      const { email, phone } = req.body;
      
      if (!email && !phone) {
        res.status(400).json({ error: "Email or phone required" });
        return;
      }
      
      const pendingBooking = await storage.findPendingBookingByEmailOrPhone(
        email || "", 
        phone || ""
      );
      
      if (!pendingBooking) {
        res.json({ found: false, booking: null });
        return;
      }
      
      // Return booking data for pre-filling the form
      res.json({
        found: true,
        booking: {
          id: pendingBooking.id,
          customerName: pendingBooking.customerName,
          email: pendingBooking.email,
          phone: pendingBooking.phone,
          address: pendingBooking.address,
          partySize: pendingBooking.partySize,
          packageType: pendingBooking.packageType,
          eventDate: pendingBooking.eventDate,
          eventTime: pendingBooking.eventTime,
          notes: pendingBooking.notes,
          createdAt: pendingBooking.createdAt,
        }
      });
    } catch (error) {
      console.error("Error looking up pending booking:", error);
      res.status(500).json({ error: "Failed to lookup booking" });
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
      
      // Set 3-day expiry for pending bookings
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);
      await storage.setPendingExpiry(booking.id, expiresAt);

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

  // Create checkout session for an existing verified booking
  app.post("/api/create-checkout-session-for-booking", async (req, res) => {
    try {
      const { bookingId, distanceMiles, travelFeeCents } = req.body;
      
      if (!bookingId) {
        res.status(400).json({ error: "Missing booking ID" });
        return;
      }

      const booking = await storage.getBooking(parseInt(bookingId));
      if (!booking) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }

      // Prevent duplicate payments
      if (booking.status === "confirmed" || (booking.amountPaid && booking.amountPaid > 0)) {
        res.status(400).json({ error: "This booking has already been paid" });
        return;
      }

      const packageInfo = PACKAGE_PRICES[booking.packageType];
      if (!packageInfo) {
        res.status(400).json({ error: "Invalid package type" });
        return;
      }

      // Update booking with travel fee if provided
      const travelFee = travelFeeCents ? parseInt(travelFeeCents) : 0;
      const distance = distanceMiles ? parseFloat(distanceMiles) : 0;
      if (travelFee > 0 || distance > 0) {
        await storage.updateBookingTravelFee(booking.id, Math.round(distance), travelFee);
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const stripeSettings = await storage.getStripeSettings();
      const connectedAccountId = stripeSettings?.stripeAccountStatus === 'active' 
        ? stripeSettings.stripeAccountId 
        : null;
      
      // Build line items - package + optional travel fee
      const lineItems: any[] = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: packageInfo.name,
            description: `Event Date: ${booking.eventDate} at ${booking.eventTime}`,
          },
          unit_amount: packageInfo.amount,
        },
        quantity: 1,
      }];
      
      // Add travel fee as separate line item if applicable
      if (travelFee > 0) {
        const extraMiles = distance > FREE_MILES ? Math.ceil(distance - FREE_MILES) : 0;
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Travel Fee',
              description: `Distance: ${distance} miles (${extraMiles} miles beyond ${FREE_MILES} free miles @ $${PRICE_PER_MILE_CENTS / 100}/mile)`,
            },
            unit_amount: travelFee,
          },
          quantity: 1,
        });
      }
      
      const sessionParams: any = {
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${baseUrl}/booking-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`,
        cancel_url: `${baseUrl}/booking-cancelled?booking_id=${booking.id}`,
        customer_email: booking.email,
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
      console.error("Checkout session for booking error:", error);
      res.status(400).json({ error: "Failed to create checkout session" });
    }
  });

  // Process Venmo payment for an existing verified booking
  app.post("/api/process-venmo-booking", async (req, res) => {
    try {
      const { bookingId, distanceMiles, travelFeeCents } = req.body;
      
      if (!bookingId) {
        res.status(400).json({ error: "Missing booking ID" });
        return;
      }

      const booking = await storage.getBooking(parseInt(bookingId));
      if (!booking) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }

      // Prevent duplicate payments
      if (booking.status === "confirmed" || (booking.amountPaid && booking.amountPaid > 0)) {
        res.status(400).json({ error: "This booking has already been paid" });
        return;
      }

      const packageInfo = PACKAGE_PRICES[booking.packageType];
      if (!packageInfo) {
        res.status(400).json({ error: "Invalid package type" });
        return;
      }

      // Calculate total with travel fee
      const travelFee = travelFeeCents ? parseInt(travelFeeCents) : 0;
      const distance = distanceMiles ? parseFloat(distanceMiles) : 0;
      const totalAmount = packageInfo.amount + travelFee;

      // Update booking with travel fee if provided
      if (travelFee > 0 || distance > 0) {
        await storage.updateBookingTravelFee(booking.id, Math.round(distance), travelFee);
      }

      // Update booking with Venmo payment info
      const updatedNotes = booking.notes 
        ? `${booking.notes}\n\n[VENMO PAYMENT - Awaiting payment to @joe4216]`
        : "[VENMO PAYMENT - Awaiting payment to @joe4216]";
      
      await storage.updateBookingForVenmo(booking.id, totalAmount, updatedNotes);

      const amountInDollars = totalAmount / 100;
      res.json({ 
        bookingId: booking.id, 
        amount: amountInDollars,
        amountCents: totalAmount,
        packageName: packageInfo.name,
        eventDate: booking.eventDate,
        eventTime: booking.eventTime,
        email: booking.email,
        travelFee: travelFee / 100,
        success: true 
      });
    } catch (error) {
      console.error("Process Venmo booking error:", error);
      res.status(400).json({ error: "Failed to process Venmo booking" });
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
      
      // Set 3-day expiry for pending bookings
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);
      await storage.setPendingExpiry(booking.id, expiresAt);
      
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

        // Generate confirmation number and send email
        const confirmationNumber = generateConfirmationNumber();
        await storage.setBookingConfirmationNumber(booking.id, confirmationNumber);

        const packageInfo = PACKAGE_PRICES[booking.packageType];
        const packageName = packageInfo?.name || booking.packageType;

        const { sendBookingConfirmationEmail } = await import("./email");
        await sendBookingConfirmationEmail(booking.email, confirmationNumber, {
          customerName: booking.customerName,
          eventDate: booking.eventDate,
          eventTime: booking.eventTime,
          packageName,
          address: booking.address,
          partySize: booking.partySize,
          amountPaid: receivedAmountCents,
        });
        
        res.json({
          success: true,
          receiptUrl,
          verified: true,
          confirmationNumber,
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

      // If verified, generate confirmation number and send email
      if (verified === true) {
        const confirmationNumber = generateConfirmationNumber();
        await storage.setBookingConfirmationNumber(booking.id, confirmationNumber);

        const packageInfo = PACKAGE_PRICES[booking.packageType];
        const packageName = packageInfo?.name || booking.packageType;

        const { sendBookingConfirmationEmail } = await import("./email");
        await sendBookingConfirmationEmail(booking.email, confirmationNumber, {
          customerName: booking.customerName,
          eventDate: booking.eventDate,
          eventTime: booking.eventTime,
          packageName,
          address: booking.address,
          partySize: booking.partySize,
          amountPaid: amountCents,
        });

        res.json({ success: true, booking: { ...booking, confirmationNumber } });
      } else {
        res.json({ success: true, booking });
      }
    } catch (error) {
      console.error("Manual verification error:", error);
      res.status(500).json({ error: "Failed to verify payment" });
    }
  });

  // Booking email verification - send code
  app.post("/api/booking/send-verification", async (req, res) => {
    try {
      const { bookingId } = req.body;
      
      if (!bookingId) {
        res.status(400).json({ error: "Missing booking ID" });
        return;
      }

      const booking = await storage.getBooking(parseInt(bookingId));
      if (!booking) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }

      if (booking.emailVerified) {
        res.json({ success: true, alreadyVerified: true });
        return;
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await storage.setBookingEmailVerification(booking.id, code, expiresAt);

      // Send verification email
      const { sendBookingVerificationEmail } = await import("./email");
      const result = await sendBookingVerificationEmail(booking.email, code, booking.customerName);

      if (!result.success) {
        res.status(500).json({ error: "Failed to send verification email" });
        return;
      }

      res.json({ success: true, email: booking.email });
    } catch (error) {
      console.error("Send verification error:", error);
      res.status(500).json({ error: "Failed to send verification code" });
    }
  });

  // Booking email verification - verify code
  app.post("/api/booking/verify-email", async (req, res) => {
    try {
      const { bookingId, code } = req.body;
      
      if (!bookingId || !code) {
        res.status(400).json({ error: "Missing booking ID or code" });
        return;
      }

      const booking = await storage.getBooking(parseInt(bookingId));
      if (!booking) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }

      if (booking.emailVerified) {
        res.json({ success: true, alreadyVerified: true });
        return;
      }

      // Check if code matches and not expired
      if (booking.emailVerificationCode !== code) {
        res.status(400).json({ error: "Invalid verification code" });
        return;
      }

      if (!booking.emailVerificationExpires || new Date(booking.emailVerificationExpires) < new Date()) {
        res.status(400).json({ error: "Verification code has expired" });
        return;
      }

      // Mark email as verified
      await storage.verifyBookingEmail(booking.id);

      res.json({ success: true });
    } catch (error) {
      console.error("Verify email error:", error);
      res.status(500).json({ error: "Failed to verify email" });
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

        if (booking) {
          // Generate confirmation number
          const confirmationNumber = generateConfirmationNumber();
          await storage.setBookingConfirmationNumber(booking.id, confirmationNumber);

          // Get package name for email
          const packageInfo = PACKAGE_PRICES[booking.packageType];
          const packageName = packageInfo?.name || booking.packageType;

          // Send confirmation email
          const { sendBookingConfirmationEmail } = await import("./email");
          await sendBookingConfirmationEmail(booking.email, confirmationNumber, {
            customerName: booking.customerName,
            eventDate: booking.eventDate,
            eventTime: booking.eventTime,
            packageName,
            address: booking.address,
            partySize: booking.partySize,
            amountPaid: session.amount_total || 0,
          });

          res.json({ success: true, booking: { ...booking, confirmationNumber } });
        } else {
          res.json({ success: true, booking });
        }
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

  // News Feed Event routes
  
  // Upload thumbnail for news feed event
  app.post("/api/news-feed/upload-thumbnail", (req, res, next) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    upload.single("thumbnail")(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ error: "Image too large. Maximum size is 10MB." });
          }
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        return res.status(400).json({ error: err.message || "Upload failed" });
      }
      next();
    });
  }, async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No image provided" });
        return;
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), "uploads", "thumbnails");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Save file with unique name
      const ext = path.extname(file.originalname) || ".jpg";
      const filename = `thumbnail_${Date.now()}${ext}`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, file.buffer);

      // Return the URL path
      const thumbnailUrl = `/uploads/thumbnails/${filename}`;
      res.json({ success: true, thumbnailUrl });
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      res.status(500).json({ error: "Failed to upload thumbnail" });
    }
  });

  app.get("/api/news-feed", async (req, res) => {
    try {
      const events = await storage.getNewsFeedEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching news feed events:", error);
      res.status(500).json({ error: "Failed to fetch news feed events" });
    }
  });

  app.get("/api/news-feed/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getNewsFeedEvent(id);
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching news feed event:", error);
      res.status(500).json({ error: "Failed to fetch news feed event" });
    }
  });

  app.post("/api/news-feed", async (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const existingEvents = await storage.getNewsFeedEvents();
      if (existingEvents.length >= 3) {
        res.status(400).json({ error: "Maximum of 3 events allowed. Please delete an existing event first." });
        return;
      }
      const validatedData = insertNewsFeedEventSchema.parse(req.body);
      const event = await storage.createNewsFeedEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating news feed event:", error);
      res.status(400).json({ error: "Failed to create news feed event" });
    }
  });

  app.patch("/api/news-feed/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const id = parseInt(req.params.id);
      const event = await storage.updateNewsFeedEvent(id, req.body);
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      res.json(event);
    } catch (error) {
      console.error("Error updating news feed event:", error);
      res.status(400).json({ error: "Failed to update news feed event" });
    }
  });

  app.delete("/api/news-feed/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const id = parseInt(req.params.id);
      await storage.deleteNewsFeedEvent(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting news feed event:", error);
      res.status(500).json({ error: "Failed to delete news feed event" });
    }
  });

  // Calendar subscription endpoints
  app.post("/api/calendar-subscriptions", async (req, res) => {
    try {
      const { email, subscribeToUpdates, reminder48Hours, reminder24Hours } = req.body;
      
      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      // Check if already subscribed
      const existing = await storage.getCalendarSubscriberByEmail(email.toLowerCase());
      if (existing) {
        res.status(400).json({ error: "This email is already subscribed" });
        return;
      }

      // Generate unsubscribe token
      const unsubscribeToken = crypto.randomBytes(32).toString('hex');

      const subscriber = await storage.createCalendarSubscriber({
        email: email.toLowerCase(),
        subscribeToUpdates: subscribeToUpdates ?? true,
        reminder48Hours: reminder48Hours ?? true,
        reminder24Hours: reminder24Hours ?? true,
        unsubscribeToken,
      });

      // Send confirmation email
      const { sendSubscriptionConfirmationEmail } = await import("./email");
      await sendSubscriptionConfirmationEmail(email, unsubscribeToken);

      res.status(201).json({ success: true, message: "Successfully subscribed to calendar updates" });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });

  app.get("/api/calendar-subscriptions", async (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const subscribers = await storage.getCalendarSubscribers();
      res.json(subscribers);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  app.delete("/api/calendar-subscriptions/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const subscriber = await storage.getCalendarSubscriberByToken(token);
      
      if (!subscriber) {
        res.status(404).json({ error: "Subscription not found" });
        return;
      }

      await storage.deleteCalendarSubscriber(token);
      res.json({ success: true, message: "Successfully unsubscribed" });
    } catch (error) {
      console.error("Error deleting subscription:", error);
      res.status(500).json({ error: "Failed to unsubscribe" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
