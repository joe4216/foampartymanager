import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertBooking, Booking } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPackage?: string;
}

export default function BookingModal({ open, onOpenChange, selectedPackage }: BookingModalProps) {
  const [date, setDate] = useState<Date>();
  const [formData, setFormData] = useState({
    customerName: "",
    email: "",
    phone: "",
    address: "",
    partySize: "",
    packageType: selectedPackage || "",
    eventTime: "",
    notes: ""
  });
  const { toast } = useToast();

  const { data: existingBookings = [], refetch } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: open,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  const bookedDates = new Set(
    existingBookings
      .filter(b => b.status === "confirmed" || b.status === "pending")
      .map(b => b.eventDate)
  );

  const isDateAvailable = (checkDate: Date) => {
    const dateString = format(checkDate, "yyyy-MM-dd");
    return !bookedDates.has(dateString);
  };

  const selectedDateAvailable = date ? isDateAvailable(date) : true;

  const createBookingMutation = useMutation({
    mutationFn: async (booking: InsertBooking) => {
      const res = await apiRequest("POST", "/api/bookings", booking);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Request Submitted!",
        description: "We'll contact you within 24 hours to confirm your foam party.",
      });
      onOpenChange(false);
      setFormData({
        customerName: "",
        email: "",
        phone: "",
        address: "",
        partySize: "",
        packageType: "",
        eventTime: "",
        notes: ""
      });
      setDate(undefined);
    },
    onError: () => {
      toast({
        title: "Booking Failed",
        description: "There was an error submitting your booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast({
        title: "Date Required",
        description: "Please select an event date.",
        variant: "destructive",
      });
      return;
    }

    if (!isDateAvailable(date)) {
      toast({
        title: "Date Unavailable",
        description: "This date is already booked. Please select another date.",
        variant: "destructive",
      });
      return;
    }

    const bookingData: InsertBooking = {
      customerName: formData.customerName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      partySize: parseInt(formData.partySize),
      packageType: formData.packageType,
      eventDate: format(date, "yyyy-MM-dd"),
      eventTime: formData.eventTime,
      notes: formData.notes || null,
    };

    createBookingMutation.mutate(bookingData);
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-['Poppins']">Book Your Foam Party</DialogTitle>
          <DialogDescription>
            Fill out the details below and we'll get back to you within 24 hours to confirm your booking.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.customerName}
                onChange={(e) => updateField('customerName', e.target.value)}
                placeholder="John Doe"
                required
                data-testid="input-customer-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="john@example.com"
                required
                data-testid="input-email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="(555) 123-4567"
                required
                data-testid="input-phone"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="party-size">Party Size *</Label>
              <Input
                id="party-size"
                type="number"
                value={formData.partySize}
                onChange={(e) => updateField('partySize', e.target.value)}
                placeholder="50"
                min="1"
                required
                data-testid="input-party-size"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Event Address *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="123 Main St, City, State ZIP"
              required
              data-testid="input-address"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Package *</Label>
              <Select 
                value={formData.packageType} 
                onValueChange={(value) => updateField('packageType', value)}
                required
              >
                <SelectTrigger data-testid="select-package">
                  <SelectValue placeholder="Select a package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basic Party">Basic Party - $199</SelectItem>
                  <SelectItem value="Standard Party">Standard Party - $299</SelectItem>
                  <SelectItem value="Premium Party">Premium Party - $499</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Event Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    data-testid="button-date-picker"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <div className="p-3 border-b bg-muted/50">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span>Available</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span>Booked</span>
                      </div>
                    </div>
                  </div>
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    disabled={(checkDate) => {
                      const isPast = checkDate < new Date(new Date().setHours(0, 0, 0, 0));
                      const dateString = format(checkDate, "yyyy-MM-dd");
                      const isBooked = bookedDates.has(dateString);
                      return isPast || isBooked;
                    }}
                    modifiers={{
                      booked: (checkDate) => {
                        const dateString = format(checkDate, "yyyy-MM-dd");
                        return bookedDates.has(dateString);
                      }
                    }}
                    modifiersStyles={{
                      booked: {
                        backgroundColor: "hsl(var(--destructive))",
                        color: "hsl(var(--destructive-foreground))",
                        fontWeight: "bold",
                        textDecoration: "line-through"
                      }
                    }}
                    data-testid="calendar-event-date"
                  />
                </PopoverContent>
              </Popover>
              {date && !selectedDateAvailable && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This date is already booked. Please select another date.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="time">Event Time *</Label>
              <Select 
                value={formData.eventTime} 
                onValueChange={(value) => updateField('eventTime', value)}
                required
              >
                <SelectTrigger data-testid="select-time">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10:00 AM">10:00 AM</SelectItem>
                  <SelectItem value="12:00 PM">12:00 PM</SelectItem>
                  <SelectItem value="2:00 PM">2:00 PM</SelectItem>
                  <SelectItem value="4:00 PM">4:00 PM</SelectItem>
                  <SelectItem value="6:00 PM">6:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Special Requests (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Any special requirements or questions?"
              rows={3}
              data-testid="input-notes"
            />
          </div>
          
          <div className="flex gap-4 justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={createBookingMutation.isPending}
              data-testid="button-cancel-booking"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createBookingMutation.isPending}
              data-testid="button-submit-booking"
            >
              {createBookingMutation.isPending ? "Submitting..." : "Submit Booking Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
