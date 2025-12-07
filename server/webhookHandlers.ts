import { getStripeSync } from './stripeClient';
import { storage } from './storage';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature, uuid);

    try {
      const event = JSON.parse(payload.toString());
      
      if (event.type === 'checkout.session.completed') {
        const session = event.data?.object;
        
        if (session?.payment_status === 'paid' && session?.metadata?.bookingId) {
          const bookingId = parseInt(session.metadata.bookingId);
          const existingBooking = await storage.getBooking(bookingId);
          
          if (existingBooking && existingBooking.status === 'pending') {
            await storage.updateBookingPayment(
              bookingId,
              session.id,
              session.amount_total || 0
            );
            console.log(`Webhook: Booking ${bookingId} confirmed via checkout.session.completed`);
          }
        }
      }
    } catch (err) {
      console.error('Error processing custom webhook logic:', err);
    }
  }
}
