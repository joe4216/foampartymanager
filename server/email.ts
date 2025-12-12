import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationCode(
  email: string, 
  code: string,
  firstName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Foam Works Party Co <onboarding@resend.dev>',
      to: email,
      subject: 'Your Login Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Foam Works Party Co</h2>
          <p>Hi ${firstName || 'there'},</p>
          <p>Your verification code is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
          </div>
          <p>This code expires in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">Foam Works Party Co - Foaming Around and Find Out</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Email send error:', err);
    return { success: false, error: err.message || 'Failed to send email' };
  }
}
