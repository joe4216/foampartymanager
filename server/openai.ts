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
      model: "gpt-5",
      messages,
      response_format: { type: "json_object" },
      max_completion_tokens: 800,
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
  error?: string;
}

export async function analyzeVenmoReceipt(base64Image: string): Promise<ReceiptAnalysisResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are analyzing a Venmo payment screenshot to extract the payment amount. 
Look for:
- The payment amount (e.g., "$345.00", "345", etc.)
- Make sure it's the amount SENT/PAID, not a balance or other number
- Venmo receipts typically show "You paid [name] $XX.XX"

Respond with JSON in this exact format:
{
  "amount": 345.00,
  "confidence": "high",
  "rawText": "You paid Joe $345.00"
}

- amount should be a number (just the numeric value, no dollar sign)
- confidence should be "high", "medium", or "low"
- rawText should be the relevant text you found that shows the payment

If you cannot find a clear payment amount, set amount to null and explain in rawText.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this Venmo payment screenshot and extract the payment amount."
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
      max_completion_tokens: 500,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return {
        amount: null,
        confidence: "low",
        rawText: "No response from AI",
        error: "Empty response"
      };
    }

    const result = JSON.parse(content);
    return {
      amount: result.amount,
      confidence: result.confidence || "medium",
      rawText: result.rawText || ""
    };
  } catch (error: any) {
    console.error("OpenAI receipt analysis error:", error);
    return {
      amount: null,
      confidence: "low",
      rawText: "",
      error: error.message || "Failed to analyze receipt"
    };
  }
}
