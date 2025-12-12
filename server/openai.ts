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
  intent: "lookup_booking" | "view_details" | "reschedule" | "cancel" | "contact_owner" | "general_info" | "greeting" | "unknown";
  extractedEmail?: string;
  extractedPhone?: string;
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
CUSTOMER'S BOOKING:
- Booking ID: ${context.booking.id}
- Name: ${context.booking.customerName}
- Package: ${context.booking.packageType}
- Date: ${context.booking.eventDate}
- Time: ${context.booking.eventTime}
- Status: ${context.booking.status}
- Email: ${context.booking.email}
` : "No booking found for this customer yet."}

YOUR CAPABILITIES:
1. Help customers find their booking by email or phone number
2. Show booking details once verified
3. Help reschedule events (get new date/time)
4. Help cancel bookings
5. Take messages for the owner
6. Answer general questions about foam parties and packages

INSTRUCTIONS:
- Be friendly and helpful
- If someone wants to modify a booking but you don't have their booking info, ask for their email or phone number first
- For rescheduling, ask for their preferred new date and time
- For cancellations, confirm they want to cancel and explain any policies
- Keep responses concise but warm

Respond with JSON in this format:
{
  "message": "Your friendly response to the customer",
  "intent": "one of: lookup_booking, view_details, reschedule, cancel, contact_owner, general_info, greeting, unknown",
  "extractedEmail": "email if customer provided one",
  "extractedPhone": "phone if customer provided one",
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
