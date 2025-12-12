import OpenAI from "openai";
import type { Booking } from "@shared/schema";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatContext {
  booking?: Booking;
  conversationHistory: ChatMessage[];
}

interface ChatResponse {
  message: string;
  intent: "lookup_booking" | "verify_phone" | "verify_name" | "view_details" | "reschedule" | "cancel" | "contact_owner" | "general_info" | "greeting" | "unknown";
  extractedBookingId?: string;
  extractedPhone?: string;
  extractedName?: string;
  newDate?: string;
  newTime?: string;
  ownerMessage?: string;
}

export async function processChatMessage(
  userMessage: string,
  context: ChatContext
): Promise<ChatResponse> {
  try {
    const systemPrompt = `You are a friendly customer service assistant for Foam Works Party Co, a foam party rental business. Your job is to help customers with their bookings and provide information.

BUSINESS INFO:
- We offer foam party packages: Foam Party Essentials ($299), Foam Party Deluxe ($399), Ultimate Foam Experience ($499)
- All packages include foam machine rental, setup, and cleanup
- Events typically last 2-4 hours
- We serve the local area with delivery and setup included
- Contact: We're available via this chat or customers can leave a message for the owner

${context.booking ? `
CUSTOMER'S VERIFIED BOOKING:
- Booking ID: ${context.booking.id}
- Name: ${context.booking.customerName}
- Package: ${context.booking.packageType}
- Date: ${context.booking.eventDate}
- Time: ${context.booking.eventTime}
- Status: ${context.booking.status}
- Payment: ${context.booking.status === 'confirmed' ? 'PAID' : 'PENDING PAYMENT'}
- Email: ${context.booking.email}

Since their booking is verified, you can help them with: viewing details, rescheduling, canceling, or contacting the owner.
${context.booking.status !== 'confirmed' ? 'IMPORTANT: Their payment is still pending. Let them know they need to complete payment.' : ''}
` : "No booking verified yet for this customer."}

VERIFICATION FLOW (follow this order):
1. FIRST ask for their BOOKING NUMBER (the ID they received when booking)
2. If they don't have the booking number, ask for their PHONE NUMBER
3. If multiple bookings found with same phone, ask for their FIRST AND LAST NAME to identify the correct booking
4. Once verified, show their booking status and payment status, then ask what they'd like to do

YOUR CAPABILITIES:
1. Verify customers using booking number, phone, or name
2. Show booking details and payment status once verified
3. Help reschedule events (get new date/time) - only if payment confirmed
4. Help cancel bookings
5. Take messages for the owner
6. Answer general questions about foam parties and packages

SPECIAL RESPONSES:
- If user says "Just browsing" or similar, respond with a friendly overview of your packages:
  "No problem! Here's what we offer:
  
  • Foam Party Essentials ($299) - Perfect for smaller gatherings, includes foam machine rental, setup, and cleanup
  • Foam Party Deluxe ($399) - Great for medium events with extended foam time
  • Ultimate Foam Experience ($499) - Our premium package for the biggest celebrations
  
  All packages include delivery, setup, and cleanup. Would you like more details on any package, or are you ready to book?"

- If user says "I have my booking number", respond: "Great! Please enter your booking number and I'll pull up your reservation."

- If user says "I don't have my booking number", respond: "No problem! I can look up your booking using your phone number. What's the phone number you used when booking?"

INSTRUCTIONS:
- Be friendly and helpful
- Always verify the customer first before allowing booking changes
- Extract booking ID if they provide a number like "my booking is 123" or "booking number 123"
- PHONE NUMBER EXTRACTION: Extract phone numbers in ANY format the user provides. Examples of valid formats you should recognize:
  * 5551234567
  * 555-123-4567
  * (555) 123-4567
  * 555.123.4567
  * +1 555-123-4567
  * 1-555-123-4567
  When extracting, return ONLY the digits (no dashes, spaces, parentheses, or +1 prefix). For example, "(555) 123-4567" should be extracted as "5551234567"
- Extract first and last name if needed for disambiguation
- For rescheduling, ensure payment is confirmed first
- For cancellations, confirm they want to cancel
- Keep responses concise but warm

Respond with JSON in this format:
{
  "message": "Your friendly response to the customer",
  "intent": "one of: lookup_booking, verify_phone, verify_name, view_details, reschedule, cancel, contact_owner, general_info, greeting, unknown",
  "extractedBookingId": "booking ID number if customer provided one",
  "extractedPhone": "phone number if customer provided one (digits only)",
  "extractedName": "full name if customer provided first and last name",
  "newDate": "new date if customer is rescheduling (format: YYYY-MM-DD)",
  "newTime": "new time if customer is rescheduling",
  "ownerMessage": "message content if customer wants to contact owner"
}`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...context.conversationHistory.slice(-6).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: userMessage },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return {
        message: "I'm sorry, I couldn't process your request. Please try again.",
        intent: "unknown",
      };
    }

    return JSON.parse(content);
  } catch (error: any) {
    console.error("Chat processing error:", error);
    return {
      message: "I'm having trouble right now. Please try again in a moment, or contact us directly.",
      intent: "unknown",
    };
  }
}

interface ReceiptAnalysisResult {
  amount: number | null;
  confidence: "high" | "medium" | "low";
  rawText: string;
  isVenmoReceipt: boolean;
  recipientMatch: boolean;
  error?: string;
}

export async function analyzeVenmoReceipt(base64Image: string, expectedRecipient: string = "joe"): Promise<ReceiptAnalysisResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a STRICT Venmo payment receipt analyzer. Your job is to verify if an image is a legitimate Venmo payment screenshot.

REQUIREMENTS FOR A VALID VENMO RECEIPT:
1. Must clearly be from the Venmo app (look for Venmo branding, logo, or UI elements)
2. Must show a COMPLETED payment (not a request, not a pending transaction)
3. Must show "You paid" or "Payment to" or similar text indicating money was SENT
4. Must show a dollar amount that was paid
5. Must show a recipient name

RED FLAGS (reject these):
- Random images with just numbers
- Edited/photoshopped images with obvious text overlays
- Screenshots from other payment apps (PayPal, Cash App, Zelle, etc.)
- Balance screens (not payment confirmations)
- Payment requests (not completed payments)
- Images that don't look like Venmo's UI at all

Respond with JSON in this exact format:
{
  "isVenmoReceipt": true,
  "amount": 345.00,
  "recipientName": "Joe",
  "recipientMatch": true,
  "confidence": "high",
  "rawText": "You paid Joe $345.00",
  "reasoning": "Screenshot shows Venmo payment confirmation with correct UI elements"
}

Field descriptions:
- isVenmoReceipt: true ONLY if this is clearly a Venmo payment confirmation screenshot
- amount: the dollar amount paid (number, no $ sign), or null if not found
- recipientName: who the payment was made to
- recipientMatch: true if the recipient name contains "${expectedRecipient}" (case insensitive)
- confidence: "high" only if ALL requirements are clearly met, "medium" if some uncertainty, "low" if suspicious
- rawText: the exact payment text you found
- reasoning: brief explanation of your analysis

If this is NOT a valid Venmo receipt, set isVenmoReceipt to false and explain why in reasoning.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this image and verify if it's a legitimate Venmo payment receipt."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return {
        amount: null,
        confidence: "low",
        rawText: "No response from AI",
        isVenmoReceipt: false,
        recipientMatch: false,
        error: "Empty response"
      };
    }

    const result = JSON.parse(content);
    return {
      amount: result.amount,
      confidence: result.confidence || "low",
      rawText: result.rawText || "",
      isVenmoReceipt: result.isVenmoReceipt === true,
      recipientMatch: result.recipientMatch === true,
    };
  } catch (error: any) {
    console.error("OpenAI receipt analysis error:", error);
    return {
      amount: null,
      confidence: "low",
      rawText: "",
      isVenmoReceipt: false,
      recipientMatch: false,
      error: error.message || "Failed to analyze receipt"
    };
  }
}
