import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationCode(
  email: string, 
  code: string,
  firstName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Foam Works Party Co <noreply@foamworkspartyco.com>',
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

export async function sendPasswordResetCode(
  email: string, 
  code: string,
  firstName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Foam Works Party Co <noreply@foamworkspartyco.com>',
      to: email,
      subject: 'Reset Your Password - Foam Works Party Co',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Foam Works Party Co</h2>
          <p>Hi ${firstName || 'there'},</p>
          <p>We received a request to reset your password. Use this code to create a new password:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
          </div>
          <p>This code expires in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
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

export async function sendBookingVerificationEmail(
  email: string,
  code: string,
  customerName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const firstName = customerName.split(' ')[0];
    const { data, error } = await resend.emails.send({
      from: 'Foam Works Party Co <noreply@foamworkspartyco.com>',
      to: email,
      subject: 'Verify Your Email - Foam Party Booking',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Foam Works Party Co</h2>
          <p>Hi ${firstName},</p>
          <p>Thanks for starting your foam party booking! Please verify your email address by entering this code:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
          </div>
          <p>This code expires in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">Once verified, you'll be able to proceed with payment to confirm your booking.</p>
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

interface PendingBookingReminderDetails {
  customerName: string;
  eventDate: string;
  eventTime: string;
  packageName: string;
  bookingId: number;
}

export async function sendPendingBookingReminder(
  email: string,
  booking: PendingBookingReminderDetails
): Promise<{ success: boolean; error?: string }> {
  try {
    const firstName = booking.customerName.split(' ')[0];
    
    const { data, error } = await resend.emails.send({
      from: 'Foam Works Party Co <noreply@foamworkspartyco.com>',
      to: email,
      subject: 'Complete Your Foam Party Booking - Expires Tomorrow!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Foam Works Party Co</h2>
          <p>Hi ${firstName},</p>
          
          <p>You started a foam party booking but haven't completed payment yet. <strong>Your booking will be cancelled tomorrow if payment isn't completed.</strong></p>
          
          <div style="background-color: #f4f4f4; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Your Booking Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; color: #666;">Package:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: 500;">${booking.packageName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; color: #666;">Date:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: 500;">${booking.eventDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Time:</td>
                <td style="padding: 8px 0; font-weight: 500;">${booking.eventTime}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #fef3c7; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e;"><strong>Don't miss out!</strong> Complete your payment now to secure your date. If someone else books this time slot before you complete payment, you'll need to choose a different time.</p>
          </div>
          
          <p style="color: #666;">To complete your booking, simply visit our website and enter your email address - we'll automatically pull up your saved information!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://foamworkspartyco.com" style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Complete My Booking</a>
          </div>
          
          <p style="color: #666; font-size: 14px;">Questions? Reply to this email or use our chatbot for instant help!</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">Foam Works Party Co - Foaming Around and Find Out</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend reminder error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Reminder email send error:', err);
    return { success: false, error: err.message || 'Failed to send reminder email' };
  }
}

export async function sendBookingCancelledEmail(
  email: string,
  customerName: string,
  eventDate: string,
  packageName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const firstName = customerName.split(' ')[0];
    
    const { data, error } = await resend.emails.send({
      from: 'Foam Works Party Co <noreply@foamworkspartyco.com>',
      to: email,
      subject: 'Your Foam Party Booking Has Been Cancelled',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Foam Works Party Co</h2>
          <p>Hi ${firstName},</p>
          
          <p>Unfortunately, your foam party booking for <strong>${eventDate}</strong> (${packageName}) has been cancelled because payment was not completed within the 3-day reservation window.</p>
          
          <div style="background-color: #fef2f2; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ef4444;">
            <p style="margin: 0; color: #991b1b;">Your time slot is now available for other customers.</p>
          </div>
          
          <p>If you'd still like to book a foam party, visit our website to start a new booking. We'd love to help you create an amazing foam party experience!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://foamworkspartyco.com" style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Book a New Party</a>
          </div>
          
          <p style="color: #666; font-size: 14px;">Questions? Reply to this email or use our chatbot for instant help!</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">Foam Works Party Co - Foaming Around and Find Out</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend cancellation error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Cancellation email send error:', err);
    return { success: false, error: err.message || 'Failed to send cancellation email' };
  }
}

interface BookingDetails {
  customerName: string;
  eventDate: string;
  eventTime: string;
  packageName: string;
  address: string;
  partySize: number;
  amountPaid: number;
}

export async function sendBookingConfirmationEmail(
  email: string,
  confirmationNumber: string,
  booking: BookingDetails
): Promise<{ success: boolean; error?: string }> {
  try {
    const firstName = booking.customerName.split(' ')[0];
    const formattedAmount = (booking.amountPaid / 100).toFixed(2);
    
    const { data, error } = await resend.emails.send({
      from: 'Foam Works Party Co <noreply@foamworkspartyco.com>',
      to: email,
      subject: `Booking Confirmed! ${confirmationNumber} - Foam Works Party Co`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Foam Works Party Co</h2>
          <h3 style="color: #22c55e;">Your Booking is Confirmed!</h3>
          <p>Hi ${firstName},</p>
          <p>Great news! Your foam party booking has been confirmed. Here are your details:</p>
          
          <div style="background-color: #f4f4f4; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Confirmation Number:</p>
            <p style="margin: 0 0 20px 0; font-size: 24px; font-weight: bold; color: #333; letter-spacing: 2px;">${confirmationNumber}</p>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; color: #666;">Package:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: 500;">${booking.packageName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; color: #666;">Date:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: 500;">${booking.eventDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; color: #666;">Time:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: 500;">${booking.eventTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; color: #666;">Location:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: 500;">${booking.address}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; color: #666;">Party Size:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: 500;">${booking.partySize} guests</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Amount Paid:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #22c55e;">$${formattedAmount}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #666; font-size: 14px;">Please save your confirmation number for your records. We'll see you at your event!</p>
          <p style="color: #666; font-size: 14px;">If you have any questions, feel free to reach out to us.</p>
          
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
