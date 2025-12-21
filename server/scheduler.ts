import { storage } from "./storage";
import { sendPendingBookingReminder, sendBookingCancelledEmail } from "./email";

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
    const bookingsForReminder1 = await storage.getPendingBookingsNeedingReminder1();
    console.log(`[Scheduler] Found ${bookingsForReminder1.length} bookings needing reminder 1`);
    
    for (const booking of bookingsForReminder1) {
      if (!booking.email) continue;
      
      const result = await sendPendingBookingReminder(
        booking.email,
        {
          customerName: booking.customerName,
          eventDate: booking.eventDate,
          eventTime: booking.eventTime,
          packageName: formatPackageName(booking.packageType),
          bookingId: booking.id,
          daysRemaining: 2,
        },
        1
      );
      
      if (result.success) {
        await storage.markReminder1Sent(booking.id);
        console.log(`[Scheduler] Sent reminder 1 to booking ${booking.id}`);
      } else {
        console.error(`[Scheduler] Failed to send reminder 1 to booking ${booking.id}:`, result.error);
      }
    }

    const bookingsForReminder2 = await storage.getPendingBookingsNeedingReminder2();
    console.log(`[Scheduler] Found ${bookingsForReminder2.length} bookings needing reminder 2`);
    
    for (const booking of bookingsForReminder2) {
      if (!booking.email) continue;
      
      const result = await sendPendingBookingReminder(
        booking.email,
        {
          customerName: booking.customerName,
          eventDate: booking.eventDate,
          eventTime: booking.eventTime,
          packageName: formatPackageName(booking.packageType),
          bookingId: booking.id,
          daysRemaining: 1,
        },
        2
      );
      
      if (result.success) {
        await storage.markReminder2Sent(booking.id);
        console.log(`[Scheduler] Sent reminder 2 to booking ${booking.id}`);
      } else {
        console.error(`[Scheduler] Failed to send reminder 2 to booking ${booking.id}:`, result.error);
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

async function runScheduledTasks() {
  console.log("[Scheduler] Running scheduled tasks...");
  await processReminders();
  await processExpiredBookings();
  console.log("[Scheduler] Scheduled tasks complete");
}

export function startScheduler() {
  console.log("[Scheduler] Starting abandoned booking scheduler...");
  
  runScheduledTasks();
  
  setInterval(runScheduledTasks, SCHEDULER_INTERVAL);
  
  console.log(`[Scheduler] Scheduler started, running every ${SCHEDULER_INTERVAL / 1000 / 60} minutes`);
}
