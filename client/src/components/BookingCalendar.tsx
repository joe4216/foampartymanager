import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, User, Package, MapPin, Users, Phone, Mail } from "lucide-react";

import type { Booking } from "@shared/schema";
import type { CalendarViewMode } from "@/pages/CalendarView";

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
  viewMode: CalendarViewMode;
  onBookingSelect?: (booking: Booking) => void;
}

function BookingCard({ booking, onClick }: { booking: Booking; onClick?: () => void }) {
  return (
    <div
      className={`border rounded-lg p-4 space-y-3 ${onClick ? 'cursor-pointer hover-elevate' : ''}`}
      onClick={onClick}
      data-testid={`booking-card-${booking.id}`}
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
  );
}

export default function BookingCalendar({ bookings, viewMode, onBookingSelect }: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getBookingsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookings.filter(booking => booking.eventDate === dateStr);
  };

  const handlePrev = () => {
    if (viewMode === "day") {
      setCurrentDate(subDays(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === "day") {
      setCurrentDate(addDays(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getTitle = () => {
    if (viewMode === "day") {
      return format(currentDate, "EEEE, MMMM d, yyyy");
    } else if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
    } else {
      return format(currentDate, "MMMM yyyy");
    }
  };

  if (viewMode === "day") {
    const dayBookings = getBookingsForDate(currentDate);
    const isCurrentDay = isToday(currentDate);

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-lg md:text-2xl font-bold font-['Poppins']">
              {getTitle()}
              {isCurrentDay && <Badge className="ml-2" variant="secondary">Today</Badge>}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleToday} data-testid="button-today">
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={handlePrev} data-testid="button-prev">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext} data-testid="button-next">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[60vh] overflow-y-auto">
            {dayBookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No bookings scheduled for this day
              </div>
            ) : (
              <div className="space-y-4 pr-2">
                {dayBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} onClick={() => onBookingSelect?.(booking)} />
                ))}
              </div>
            )}
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
      </Card>
    );
  }

  if (viewMode === "week") {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-lg md:text-2xl font-bold font-['Poppins']">
              {getTitle()}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleToday} data-testid="button-today">
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={handlePrev} data-testid="button-prev">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext} data-testid="button-next">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[700px]">
            {daysInWeek.map((day) => {
              const dayBookings = getBookingsForDate(day);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={day.toString()}
                  className={`border rounded-lg p-2 min-h-[300px] ${
                    isCurrentDay ? "border-primary border-2" : ""
                  }`}
                  data-testid={`week-day-${format(day, "yyyy-MM-dd")}`}
                >
                  <div className={`text-center mb-2 ${isCurrentDay ? "text-primary" : ""}`}>
                    <div className="text-xs text-muted-foreground">{format(day, "EEE")}</div>
                    <div className="text-lg font-semibold">{format(day, "d")}</div>
                  </div>
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-2 pr-2">
                      {dayBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className={`text-xs p-2 rounded ${statusColors[booking.status as keyof typeof statusColors]} text-white cursor-pointer hover-elevate`}
                          onClick={() => onBookingSelect?.(booking)}
                          data-testid={`week-event-${booking.id}`}
                        >
                          <div className="font-semibold">{booking.eventTime}</div>
                          <div className="truncate">{booking.customerName}</div>
                          <div className="text-[10px] truncate opacity-90">{booking.packageType}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
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
      </Card>
    );
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const paddingDays = Array(startDay).fill(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg md:text-2xl font-bold font-['Poppins']">
            {getTitle()}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleToday} data-testid="button-today">
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={handlePrev} data-testid="button-prev-month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNext} data-testid="button-next-month">
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
                } ${!isSameMonth(day, currentDate) ? "opacity-50" : ""}`}
                data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onBookingSelect?.(booking);
                      }}
                      data-testid={`event-${booking.id}`}
                    >
                      <div className="font-semibold truncate">{booking.eventTime}</div>
                      <div className="truncate hidden md:block">{booking.customerName}</div>
                      <div className="text-[8px] md:text-[10px] truncate opacity-90 hidden lg:block">{booking.packageType}</div>
                    </div>
                  ))}
                  {dayBookings.length > 2 && (
                    <div 
                      className="text-[10px] text-muted-foreground text-center cursor-pointer hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (dayBookings[2]) onBookingSelect?.(dayBookings[2]);
                      }}
                    >
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
    </Card>
  );
}
