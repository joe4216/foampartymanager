import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { format } from "date-fns";

import type { Booking } from "@shared/schema";

const statusColors = {
  pending: "bg-yellow-500",
  confirmed: "bg-green-500",
  completed: "bg-blue-500",
  cancelled: "bg-red-500",
};

const statusLabels = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

interface BookingCalendarProps {
  bookings: Booking[];
}

export default function BookingCalendar({ bookings }: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const bookingsForDate = bookings.filter(
    (booking) => booking.eventDate === format(selectedDate, "yyyy-MM-dd")
  );

  const datesWithBookings = new Set(bookings.map(b => b.eventDate));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-['Poppins']">Event Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md border"
            modifiers={{
              hasBooking: (date) => datesWithBookings.has(format(date, "yyyy-MM-dd"))
            }}
            modifiersClassNames={{
              hasBooking: "bg-primary/10 font-bold"
            }}
          />
          
          <div className="mt-6 flex flex-wrap gap-4">
            {Object.entries(statusColors).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                <span className="text-sm text-muted-foreground capitalize">{statusLabels[status as keyof typeof statusLabels]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-['Poppins']">
            {format(selectedDate, "MMMM d, yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookingsForDate.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No bookings for this date</p>
          ) : (
            <div className="space-y-3">
              {bookingsForDate.map((booking) => (
                <div
                  key={booking.id}
                  className="p-3 border rounded-md hover-elevate"
                  data-testid={`booking-item-${booking.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-semibold">{booking.customerName}</div>
                    <Badge variant="secondary" className="capitalize">
                      {statusLabels[booking.status as keyof typeof statusLabels]}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>{booking.packageType}</div>
                    <div>{booking.eventTime}</div>
                    <div>{booking.partySize} guests</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
