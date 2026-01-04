import BookingCalendar from "@/components/BookingCalendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { Booking } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Clock, User, Package, MapPin, Users, Phone, Mail, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export type CalendarViewMode = "day" | "week" | "month";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-green-500",
  completed: "bg-blue-500",
  cancelled: "bg-red-500",
};

export default function CalendarView() {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeToUpdates, setSubscribeToUpdates] = useState(true);
  const [reminder48Hours, setReminder48Hours] = useState(true);
  const [reminder24Hours, setReminder24Hours] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const { toast } = useToast();
  
  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const subscribeMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      subscribeToUpdates: boolean;
      reminder48Hours: boolean;
      reminder24Hours: boolean;
    }) => {
      return apiRequest("POST", "/api/calendar-subscriptions", data);
    },
    onSuccess: () => {
      toast({
        title: "Subscribed!",
        description: "You'll receive calendar updates and reminders at your email.",
      });
      setSubscribeDialogOpen(false);
      setSubscribeEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Subscription Failed",
        description: error.message || "Failed to subscribe. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = () => {
    if (!subscribeEmail) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }
    subscribeMutation.mutate({
      email: subscribeEmail,
      subscribeToUpdates,
      reminder48Hours,
      reminder24Hours,
    });
  };

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
        
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSubscribeDialogOpen(true)}
            data-testid="button-subscribe-calendar"
          >
            <Bell className="w-4 h-4 mr-2" />
            Subscribe to Updates
          </Button>
          
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
      </div>

      <BookingCalendar 
        bookings={bookings} 
        viewMode={viewMode} 
        onBookingSelect={(booking) => setSelectedBooking(booking)}
      />

      <Dialog open={subscribeDialogOpen} onOpenChange={setSubscribeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subscribe to Calendar Updates</DialogTitle>
            <DialogDescription>
              Get notified about booking changes and receive event reminders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subscribe-email">Email Address</Label>
              <Input
                id="subscribe-email"
                type="email"
                placeholder="your@email.com"
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
                data-testid="input-subscribe-email"
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-medium">Notification Preferences</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="subscribe-updates"
                  checked={subscribeToUpdates}
                  onCheckedChange={(checked) => setSubscribeToUpdates(!!checked)}
                  data-testid="checkbox-subscribe-updates"
                />
                <label
                  htmlFor="subscribe-updates"
                  className="text-sm cursor-pointer"
                >
                  Booking updates (new, rescheduled, cancelled)
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reminder-48h"
                  checked={reminder48Hours}
                  onCheckedChange={(checked) => setReminder48Hours(!!checked)}
                  data-testid="checkbox-reminder-48h"
                />
                <label
                  htmlFor="reminder-48h"
                  className="text-sm cursor-pointer"
                >
                  48-hour reminder before events
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reminder-24h"
                  checked={reminder24Hours}
                  onCheckedChange={(checked) => setReminder24Hours(!!checked)}
                  data-testid="checkbox-reminder-24h"
                />
                <label
                  htmlFor="reminder-24h"
                  className="text-sm cursor-pointer"
                >
                  24-hour reminder before events
                </label>
              </div>
            </div>
            
            <Button
              className="w-full"
              onClick={handleSubscribe}
              disabled={subscribeMutation.isPending}
              data-testid="button-confirm-subscribe"
            >
              {subscribeMutation.isPending ? "Subscribing..." : "Subscribe"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle>Booking Details</DialogTitle>
              {selectedBooking && (
                <Badge 
                  className={`${statusColors[selectedBooking.status as keyof typeof statusColors]} text-white border-0`}
                >
                  {selectedBooking.status}
                </Badge>
              )}
            </div>
            <DialogDescription>
              {selectedBooking?.confirmationNumber && (
                <span className="font-mono">Confirmation: {selectedBooking.confirmationNumber}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 py-4">
              <div className="grid gap-3 text-sm">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{selectedBooking.customerName}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedBooking.eventDate}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedBooking.eventTime}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedBooking.packageType}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedBooking.partySize} guests</span>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{selectedBooking.email}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{selectedBooking.phone}</span>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">{selectedBooking.address}</span>
                </div>

                {selectedBooking.amountPaid && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-green-600">
                      ${(selectedBooking.amountPaid / 100).toFixed(2)} paid
                    </span>
                  </div>
                )}
              </div>

              {selectedBooking.notes && (
                <div className="bg-muted rounded-md p-3 text-sm">
                  <span className="font-medium">Notes: </span>
                  {selectedBooking.notes}
                </div>
              )}

              {selectedBooking.cancelNote && (
                <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                  <span className="font-medium">Cancellation Note: </span>
                  {selectedBooking.cancelNote}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
