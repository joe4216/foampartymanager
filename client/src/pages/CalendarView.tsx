import BookingCalendar from "@/components/BookingCalendar";
import { useQuery } from "@tanstack/react-query";
import type { Booking } from "@shared/schema";

export default function CalendarView() {
  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-muted-foreground">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-['Poppins'] mb-1 md:mb-2">Calendar View</h1>
        <p className="text-sm md:text-base text-muted-foreground">Manage your bookings by date</p>
      </div>

      <BookingCalendar bookings={bookings} />
    </div>
  );
}
