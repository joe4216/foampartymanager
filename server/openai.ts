import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
