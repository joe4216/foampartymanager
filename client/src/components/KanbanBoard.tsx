import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Users, DollarSign, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";
import type { Booking } from "@shared/schema";

interface KanbanBoardProps {
  bookings: Booking[];
  onStatusChange?: (bookingId: number, newStatus: string) => void;
}

const columns = [
  { id: "pending", title: "Pending Requests", color: "border-yellow-500" },
  { id: "confirmed", title: "Confirmed", color: "border-green-500" },
  { id: "completed", title: "Completed", color: "border-blue-500" },
];

const packagePrices: Record<string, string> = {
  "Basic Party": "$199",
  "Standard Party": "$299",
  "Premium Party": "$499",
};

export default function KanbanBoard({ bookings, onStatusChange }: KanbanBoardProps) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const getBookingsByStatus = (status: string) => {
    return bookings.filter((booking) => booking.status === status);
  };

  const handleCardClick = (booking: Booking) => {
    setSelectedBooking(booking);
  };

  const handleStatusUpdate = (newStatus: string) => {
    if (selectedBooking && onStatusChange) {
      onStatusChange(selectedBooking.id, newStatus);
      setSelectedBooking(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => {
          const columnBookings = getBookingsByStatus(column.id);
          
          return (
            <Card key={column.id} className={`border-l-4 ${column.color}`}>
              <CardHeader className="pb-4">
                <CardTitle className="font-['Poppins'] flex items-center justify-between">
                  {column.title}
                  <Badge variant="secondary">{columnBookings.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-250px)]">
                  <div className="space-y-3 p-6 pt-0">
                    {columnBookings.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No bookings</p>
                    ) : (
                      columnBookings.map((booking) => (
                        <Card
                          key={booking.id}
                          className="hover-elevate cursor-pointer"
                          onClick={() => handleCardClick(booking)}
                          data-testid={`kanban-card-${booking.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="font-semibold mb-2">{booking.customerName}</div>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>{booking.eventDate} at {booking.eventTime}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                <span>{booking.partySize} guests</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                <span className="font-semibold text-foreground">
                                  {packagePrices[booking.packageType]}
                                </span>
                              </div>
                            </div>
                            <Badge variant="outline" className="mt-3">
                              {booking.packageType}
                            </Badge>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-['Poppins']">Booking Details</DialogTitle>
            <DialogDescription>
              Manage this booking and update its status
            </DialogDescription>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Customer Information</h3>
                <div className="space-y-1 text-sm">
                  <div><span className="text-muted-foreground">Name:</span> {selectedBooking.customerName}</div>
                  <div><span className="text-muted-foreground">Email:</span> {selectedBooking.email}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {selectedBooking.phone}</div>
                  <div><span className="text-muted-foreground">Address:</span> {selectedBooking.address}</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Event Details</h3>
                <div className="space-y-1 text-sm">
                  <div><span className="text-muted-foreground">Package:</span> {selectedBooking.packageType}</div>
                  <div><span className="text-muted-foreground">Date:</span> {selectedBooking.eventDate}</div>
                  <div><span className="text-muted-foreground">Time:</span> {selectedBooking.eventTime}</div>
                  <div><span className="text-muted-foreground">Party Size:</span> {selectedBooking.partySize} guests</div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{selectedBooking.status}</Badge></div>
                </div>
              </div>

              {selectedBooking.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground">{selectedBooking.notes}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-3">Update Status</h3>
                <div className="grid grid-cols-2 gap-2">
                  {selectedBooking.status === "pending" && (
                    <Button onClick={() => handleStatusUpdate("confirmed")} data-testid="button-confirm">
                      Confirm Booking
                    </Button>
                  )}
                  {selectedBooking.status === "confirmed" && (
                    <Button onClick={() => handleStatusUpdate("completed")} data-testid="button-complete">
                      Mark Completed
                    </Button>
                  )}
                  {(selectedBooking.status === "pending" || selectedBooking.status === "confirmed") && (
                    <Button variant="destructive" onClick={() => handleStatusUpdate("cancelled")} data-testid="button-cancel">
                      Cancel Booking
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
