import { storage } from "./storage";
import { sendPendingBookingReminder, sendBookingCancelledEmail, sendEventReminderEmail } from "./email";
import { format, parseISO, differenceInHours, addHours } from "date-fns";

const SCHEDULER_INTERVAL = 60 * 60 * 1000; // Run every hour

function formatPackageName(packageType: string): string {
  const packageNames: Record<string, string> = {
    "standard-2hr": "Standard Foam Party (2 Hours)",
    "standard-3hr": "Standard Foam Party (3 Hours)",
    "standard-4hr": "Standard Foam Party (4 Hours)",
    "glow-2hr": "Glow Foam Party (2 Hours)",
    "glow-3hr": "Glow Foam Party (3 Hours)",
    "glow-4hr": "Glow Foam Party (4 Hours)",
    "gender-reveal-2hr": "Gender Reveal Foam Party (2 Hours)",
    "gender-reveal-3hr": "Gender Reveal Foam Party (3 Hours)",
    "gender-reveal-4hr": "Gender Reveal Foam Party (4 Hours)",
  };
  return packageNames[packageType] || packageType;
}

async function processReminders() {
  console.log("[Scheduler] Processing pending booking reminders...");
  
  try {
    // Get bookings that are 48+ hours old and haven't received a reminder yet
    // This gives customers 24 hours warning before the 72-hour auto-cancellation
    const bookingsNeedingReminder = await storage.getPendingBookingsNeedingReminder();
    console.log(`[Scheduler] Found ${bookingsNeedingReminder.length} bookings needing reminder`);
    
    for (const booking of bookingsNeedingReminder) {
      if (!booking.email) continue;
      
      const result = await sendPendingBookingReminder(
        booking.email,
        {
          customerName: booking.customerName,
          eventDate: booking.eventDate,
          eventTime: booking.eventTime,
          packageName: formatPackageName(booking.packageType),
          bookingId: booking.id,
        }
      );
      
      if (result.success) {
        await storage.markReminderSent(booking.id);
        console.log(`[Scheduler] Sent reminder to booking ${booking.id}`);
      } else {
        console.error(`[Scheduler] Failed to send reminder to booking ${booking.id}:`, result.error);
      }
    }
  } catch (error) {
    console.error("[Scheduler] Error processing reminders:", error);
  }
}

async function processExpiredBookings() {
  console.log("[Scheduler] Processing expired pending bookings...");
  
  try {
    const expiredBookings = await storage.getExpiredPendingBookings();
    console.log(`[Scheduler] Found ${expiredBookings.length} expired pending bookings`);
    
    for (const booking of expiredBookings) {
      await storage.autoCancelBooking(booking.id, "Booking was not completed within 3 days");
      console.log(`[Scheduler] Auto-cancelled booking ${booking.id}`);
      
      if (booking.email) {
        await sendBookingCancelledEmail(
          booking.email,
          booking.customerName,
          booking.eventDate,
          formatPackageName(booking.packageType)
        );
        console.log(`[Scheduler] Sent cancellation email to booking ${booking.id}`);
      }
    }
  } catch (error) {
    console.error("[Scheduler] Error processing expired bookings:", error);
  }
}

async function processEventReminders() {
  console.log("[Scheduler] Processing calendar subscriber event reminders...");
  
  try {
    // Get all calendar subscribers
    const subscribers = await storage.getCalendarSubscribers();
    if (subscribers.length === 0) {
      console.log("[Scheduler] No calendar subscribers found");
      return;
    }
    
    // Get confirmed bookings
    const allBookings = await storage.getBookings();
    const confirmedBookings = allBookings.filter(b => b.status === "confirmed");
    
    const now = new Date();
    
    for (const booking of confirmedBookings) {
      // Parse event date and time
      const eventDateStr = booking.eventDate; // Format: "January 15, 2025" or similar
      const eventTimeStr = booking.eventTime; // Format: "2:00 PM" or similar
      
      // Try to construct a date from the event info
      let eventDateTime: Date;
      try {
        // Try parsing various date formats
        const dateMatch = eventDateStr.match(/(\w+)\s+(\d+),?\s*(\d{4})/);
        if (!dateMatch) continue;
        
        const months: Record<string, number> = {
          'January': 0, 'February': 1, 'March': 2, 'April': 3,
          'May': 4, 'June': 5, 'July': 6, 'August': 7,
          'September': 8, 'October': 9, 'November': 10, 'December': 11
        };
        
        const month = months[dateMatch[1]];
        const day = parseInt(dateMatch[2]);
        const year = parseInt(dateMatch[3]);
        
        if (month === undefined) continue;
        
        // Parse time (e.g., "2:00 PM")
        const timeMatch = eventTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        let hours = 12;
        let minutes = 0;
        
        if (timeMatch) {
          hours = parseInt(timeMatch[1]);
          minutes = parseInt(timeMatch[2]);
          const isPM = timeMatch[3].toUpperCase() === 'PM';
          if (isPM && hours !== 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
        }
        
        eventDateTime = new Date(year, month, day, hours, minutes);
      } catch (e) {
        console.error(`[Scheduler] Failed to parse date for booking ${booking.id}:`, e);
        continue;
      }
      
      const hoursUntilEvent = differenceInHours(eventDateTime, now);
      
      // Send reminders to subscribers
      for (const subscriber of subscribers) {
        // Check if 48-hour reminder is due (between 47-49 hours out)
        if (subscriber.reminder48Hours && hoursUntilEvent >= 47 && hoursUntilEvent <= 49) {
          console.log(`[Scheduler] Sending 48h reminder for booking ${booking.id} to ${subscriber.email}`);
          await sendEventReminderEmail(
            subscriber.email,
            48,
            {
              customerName: booking.customerName,
              eventDate: booking.eventDate,
              eventTime: booking.eventTime,
              packageName: formatPackageName(booking.packageType),
              address: booking.address,
            },
            subscriber.unsubscribeToken
          );
        }
        
        // Check if 24-hour reminder is due (between 23-25 hours out)
        if (subscriber.reminder24Hours && hoursUntilEvent >= 23 && hoursUntilEvent <= 25) {
          console.log(`[Scheduler] Sending 24h reminder for booking ${booking.id} to ${subscriber.email}`);
          await sendEventReminderEmail(
            subscriber.email,
            24,
            {
              customerName: booking.customerName,
              eventDate: booking.eventDate,
              eventTime: booking.eventTime,
              packageName: formatPackageName(booking.packageType),
              address: booking.address,
            },
            subscriber.unsubscribeToken
          );
        }
      }
    }
  } catch (error) {
    console.error("[Scheduler] Error processing event reminders:", error);
  }
}

async function runScheduledTasks() {
  console.log("[Scheduler] Running scheduled tasks...");
  await processReminders();
  await processExpiredBookings();
  await processEventReminders();
  console.log("[Scheduler] Scheduled tasks complete");
}

export function startScheduler() {
  console.log("[Scheduler] Starting abandoned booking scheduler...");
  
  runScheduledTasks();
  
  setInterval(runScheduledTasks, SCHEDULER_INTERVAL);
  
  console.log(`[Scheduler] Scheduler started, running every ${SCHEDULER_INTERVAL / 1000 / 60} minutes`);
}
