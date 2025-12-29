import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, User, Package, MapPin, Users, Phone, Mail } from "lucide-react";

import type { Booking } from "@shared/schema";

const statusColors = {
  pending: "bg-yellow-500",
  confirmed: "bg-green-500",
  completed: "bg-blue-500",
  cancelled: "bg-red-500",
};

const statusVariants = {
  pending: "default" as const,
  confirmed: "default" as const,
  completed: "secondary" as const,
  cancelled: "destructive" as const,
};

interface BookingCalendarProps {
  bookings: Booking[];
}

export default function BookingCalendar({ bookings }: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDay = monthStart.getDay();
  const paddingDays = Array(startDay).fill(null);

  const getBookingsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookings.filter(booking => booking.eventDate === dateStr);
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold font-['Poppins']">
            {format(currentMonth, "MMMM yyyy")}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth} data-testid="button-prev-month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth} data-testid="button-next-month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 md:gap-2 min-w-[320px]">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <div key={index} className="text-center font-semibold text-xs md:text-sm text-muted-foreground py-1 md:py-2">
              <span className="hidden md:inline">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index]}</span>
              <span className="md:hidden">{day}</span>
            </div>
          ))}

          {paddingDays.map((_, index) => (
            <div key={`padding-${index}`} className="min-h-[60px] md:min-h-[100px] lg:min-h-[120px]" />
          ))}

          {daysInMonth.map((day) => {
            const dayBookings = getBookingsForDate(day);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toString()}
                className={`min-h-[60px] md:min-h-[100px] lg:min-h-[120px] border rounded-md md:rounded-lg p-1 md:p-2 cursor-pointer hover-elevate transition-colors ${
                  isCurrentDay ? "border-primary border-2" : ""
                } ${!isSameMonth(day, currentMonth) ? "opacity-50" : ""}`}
                data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                onClick={() => setSelectedDay(day)}
              >
                <div className={`text-xs md:text-sm font-semibold mb-0.5 md:mb-1 ${isCurrentDay ? "text-primary" : ""}`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5 md:space-y-1">
                  {dayBookings.slice(0, 2).map((booking) => (
                    <div
                      key={booking.id}
                      className={`text-[10px] md:text-xs p-1 md:p-1.5 rounded ${statusColors[booking.status as keyof typeof statusColors]} text-white cursor-pointer hover-elevate`}
                      title={`${booking.customerName} - ${booking.packageType} at ${booking.eventTime}`}
                      data-testid={`event-${booking.id}`}
                    >
                      <div className="font-semibold truncate">{booking.eventTime}</div>
                      <div className="truncate hidden md:block">{booking.customerName}</div>
                      <div className="text-[8px] md:text-[10px] truncate opacity-90 hidden lg:block">{booking.packageType}</div>
                    </div>
                  ))}
                  {dayBookings.length > 2 && (
                    <div className="text-[10px] text-muted-foreground text-center">
                      +{dayBookings.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${color}`} />
              <span className="text-sm capitalize">{status}</span>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={selectedDay !== null} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-['Poppins']">
              {selectedDay && format(selectedDay, "EEEE, MMMM d, yyyy")}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            {selectedDay && (() => {
              const dayBookings = getBookingsForDate(selectedDay);
              
              if (dayBookings.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    No bookings scheduled for this day
                  </div>
                );
              }

              return (
                <div className="space-y-4 pr-4">
                  {dayBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="border rounded-lg p-4 space-y-3"
                      data-testid={`day-booking-${booking.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">{booking.eventTime}</span>
                        </div>
                        <Badge 
                          variant={statusVariants[booking.status as keyof typeof statusVariants] || "secondary"}
                          className={`${statusColors[booking.status as keyof typeof statusColors]} text-white border-0`}
                        >
                          {booking.status}
                        </Badge>
                      </div>

                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{booking.customerName}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          <span>{booking.packageType}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{booking.partySize} guests</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{booking.email}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{booking.phone}</span>
                        </div>

                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <span className="text-muted-foreground">{booking.address}</span>
                        </div>
                      </div>

                      {booking.notes && (
                        <div className="bg-muted rounded p-2 text-sm">
                          <span className="font-medium">Notes: </span>
                          {booking.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
