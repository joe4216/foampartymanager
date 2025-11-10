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
    <Card className="max-w-7xl">
      <CardHeader>
        <CardTitle className="font-['Poppins']">Event Calendar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
          className="rounded-md border w-full"
          modifiers={{
            hasBooking: (date) => datesWithBookings.has(format(date, "yyyy-MM-dd"))
          }}
          modifiersClassNames={{
            hasBooking: "bg-primary/10 font-bold"
          }}
        />
        
        <div className="flex flex-wrap gap-4 pb-4 border-b">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${color}`} />
              <span className="text-sm text-muted-foreground capitalize">{statusLabels[status as keyof typeof statusLabels]}</span>
            </div>
          ))}
        </div>

        <div>
          <h3 className="text-xl font-semibold font-['Poppins'] mb-4">
            {format(selectedDate, "MMMM d, yyyy")}
          </h3>
          
          {bookingsForDate.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No bookings for this date</p>
          ) : (
            <div className="space-y-4">
              {bookingsForDate.map((booking) => (
                <div
                  key={booking.id}
                  className="p-5 border rounded-lg hover-elevate"
                  data-testid={`booking-item-${booking.id}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h4 className="text-lg font-semibold mb-1">{booking.customerName}</h4>
                      <div className="text-sm text-muted-foreground">{booking.packageType}</div>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {statusLabels[booking.status as keyof typeof statusLabels]}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div>
                        <div className="text-muted-foreground mb-1">Contact Information</div>
                        <div className="font-medium">{booking.email}</div>
                        <div className="font-medium">{booking.phone}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Address</div>
                        <div className="font-medium">{booking.address}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="text-muted-foreground mb-1">Event Details</div>
                        <div className="font-medium">Time: {booking.eventTime}</div>
                        <div className="font-medium">Party Size: {booking.partySize} guests</div>
                      </div>
                      {booking.notes && (
                        <div>
                          <div className="text-muted-foreground mb-1">Notes</div>
                          <div className="font-medium">{booking.notes}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
