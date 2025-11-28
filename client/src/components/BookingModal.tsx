import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle, Clock, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertBooking, Booking } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPackage?: string;
}

const ALL_TIME_SLOTS = [
  "10:00 AM",
  "12:00 PM",
  "2:00 PM",
  "4:00 PM",
  "6:00 PM"
];

const PACKAGES = {
  standard: [
    { value: "Quick Foam Fun", label: "Quick Foam Fun", price: "$200", duration: "30 min" },
    { value: "Classic Party Package", label: "Classic Party Package", price: "$325", duration: "1 hour", popular: true },
    { value: "Extended Foam Experience", label: "Extended Foam Experience", price: "$430", duration: "2 hours" }
  ],
  glow: [
    { value: "Standard Glow Foam", label: "Standard Glow Foam", price: "+$125", duration: "Add-on" },
    { value: "Extended Glow Foam", label: "Extended Glow Foam", price: "+$200", duration: "Add-on" }
  ],
  genderReveal: [
    { value: "Surprise in Style", label: "Surprise in Style", price: "$300", duration: "30 min" },
    { value: "Extended Reveal Celebration", label: "Extended Reveal Celebration", price: "$475", duration: "1 hour" }
  ]
};

export default function BookingModal({ open, onOpenChange, selectedPackage }: BookingModalProps) {
  const [date, setDate] = useState<Date>();
  const [calendarOpen, setCalendarOpen] = useState(false);
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

  useEffect(() => {
    if (selectedPackage) {
      setFormData(prev => ({ ...prev, packageType: selectedPackage }));
    }
  }, [selectedPackage]);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    existingBookings
      .filter(b => b.status === "confirmed" || b.status === "pending")
      .forEach(b => {
        if (!map.has(b.eventDate)) {
          map.set(b.eventDate, new Set());
        }
        map.get(b.eventDate)!.add(b.eventTime);
      });
    return map;
  }, [existingBookings]);

  const fullyBookedDates = useMemo(() => {
    const set = new Set<string>();
    bookingsByDate.forEach((times, dateStr) => {
      if (times.size >= ALL_TIME_SLOTS.length) {
        set.add(dateStr);
      }
    });
    return set;
  }, [bookingsByDate]);

  const getAvailableTimesForDate = (checkDate: Date) => {
    const dateString = format(checkDate, "yyyy-MM-dd");
    const bookedTimes = bookingsByDate.get(dateString) || new Set();
    return ALL_TIME_SLOTS.filter(time => !bookedTimes.has(time));
  };

  const availableTimesForSelectedDate = date ? getAvailableTimesForDate(date) : ALL_TIME_SLOTS;

  useEffect(() => {
    if (date && formData.eventTime && !availableTimesForSelectedDate.includes(formData.eventTime)) {
      setFormData(prev => ({ ...prev, eventTime: "" }));
    }
  }, [date, availableTimesForSelectedDate, formData.eventTime]);

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

    if (!formData.eventTime) {
      toast({
        title: "Time Required",
        description: "Please select an event time.",
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

  const getBookedSlotsCount = (checkDate: Date) => {
    const dateString = format(checkDate, "yyyy-MM-dd");
    return bookingsByDate.get(dateString)?.size || 0;
  };

  const isFormComplete = 
    formData.customerName.trim() !== "" &&
    formData.email.trim() !== "" &&
    formData.phone.trim() !== "" &&
    formData.partySize.trim() !== "" &&
    formData.address.trim() !== "" &&
    formData.packageType !== "" &&
    formData.eventTime !== "" &&
    date !== undefined;

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
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">Standard Foam Parties</div>
                {PACKAGES.standard.map(pkg => (
                  <SelectItem key={pkg.value} value={pkg.value}>
                    <div className="flex items-center gap-2">
                      <span>{pkg.label}</span>
                      <span className="text-muted-foreground">({pkg.duration})</span>
                      <span className="font-semibold text-primary">{pkg.price}</span>
                      {pkg.popular && <Badge variant="secondary" className="text-xs">Popular</Badge>}
                    </div>
                  </SelectItem>
                ))}
                
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground mt-2">Glow Foam Add-ons</div>
                {PACKAGES.glow.map(pkg => (
                  <SelectItem key={pkg.value} value={pkg.value}>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-purple-500" />
                      <span>{pkg.label}</span>
                      <span className="font-semibold text-purple-600">{pkg.price}</span>
                    </div>
                  </SelectItem>
                ))}
                
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground mt-2">Gender Reveal Parties</div>
                {PACKAGES.genderReveal.map(pkg => (
                  <SelectItem key={pkg.value} value={pkg.value}>
                    <div className="flex items-center gap-2">
                      <span>{pkg.label}</span>
                      <span className="text-muted-foreground">({pkg.duration})</span>
                      <span className="font-semibold text-pink-600">{pkg.price}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event Date *</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
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
                <PopoverContent className="w-auto p-0" side="top" align="start">
                  <div className="p-3 border-b bg-muted/50">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        <span>Available</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span>Some slots taken</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-muted-foreground/40"></div>
                        <span>Unavailable</span>
                      </div>
                    </div>
                  </div>
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(selectedDate) => {
                      setDate(selectedDate);
                      setCalendarOpen(false);
                    }}
                    initialFocus
                    className="p-2"
                    classNames={{
                      months: "flex flex-col",
                      month: "space-y-2",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-medium",
                      nav: "space-x-1 flex items-center",
                      table: "w-full border-collapse",
                      head_row: "flex justify-between",
                      head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] text-center",
                      row: "flex w-full mt-1 justify-between",
                      cell: "h-8 w-8 text-center text-sm p-0 relative",
                      day: "h-8 w-8 p-0 font-normal rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground aria-selected:opacity-100",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-30",
                      day_hidden: "invisible",
                    }}
                    disabled={(checkDate) => {
                      const isPast = checkDate < new Date(new Date().setHours(0, 0, 0, 0));
                      const dateString = format(checkDate, "yyyy-MM-dd");
                      const isFullyBooked = fullyBookedDates.has(dateString);
                      return isPast || isFullyBooked;
                    }}
                    modifiers={{
                      partiallyBooked: (checkDate) => {
                        const isPast = checkDate < new Date(new Date().setHours(0, 0, 0, 0));
                        if (isPast) return false;
                        const bookedCount = getBookedSlotsCount(checkDate);
                        return bookedCount > 0 && bookedCount < ALL_TIME_SLOTS.length;
                      }
                    }}
                    modifiersStyles={{
                      partiallyBooked: {
                        backgroundColor: "hsl(45, 93%, 47%)",
                        color: "hsl(0, 0%, 0%)",
                        fontWeight: "bold"
                      }
                    }}
                    data-testid="calendar-event-date"
                  />
                </PopoverContent>
              </Popover>
              {date && (
                <p className="text-sm text-muted-foreground">
                  {availableTimesForSelectedDate.length} of {ALL_TIME_SLOTS.length} time slots available
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="time">Event Time *</Label>
              <Select 
                value={formData.eventTime} 
                onValueChange={(value) => updateField('eventTime', value)}
                required
                disabled={!date}
              >
                <SelectTrigger data-testid="select-time">
                  <SelectValue placeholder={date ? "Select time" : "Select date first"} />
                </SelectTrigger>
                <SelectContent>
                  {ALL_TIME_SLOTS.map(time => {
                    const isAvailable = availableTimesForSelectedDate.includes(time);
                    return (
                      <SelectItem 
                        key={time} 
                        value={time}
                        disabled={!isAvailable}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          <span>{time}</span>
                          {!isAvailable && (
                            <Badge variant="destructive" className="text-xs">Booked</Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {!date && (
                <p className="text-sm text-muted-foreground">
                  Please select a date to see available times
                </p>
              )}
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
              disabled={!isFormComplete || createBookingMutation.isPending}
              className={!isFormComplete ? "bg-muted text-muted-foreground hover:bg-muted" : ""}
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
