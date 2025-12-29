import BookingCalendar from "@/components/BookingCalendar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { Booking } from "@shared/schema";

export type CalendarViewMode = "day" | "week" | "month";

export default function CalendarView() {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-['Poppins'] mb-1 md:mb-2">Calendar View</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage your bookings by date</p>
        </div>
        
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          <Button
            variant={viewMode === "day" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("day")}
            data-testid="button-view-day"
          >
            Day
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("week")}
            data-testid="button-view-week"
          >
            Week
          </Button>
          <Button
            variant={viewMode === "month" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("month")}
            data-testid="button-view-month"
          >
            Month
          </Button>
        </div>
      </div>

      <BookingCalendar bookings={bookings} viewMode={viewMode} />
    </div>
  );
}
