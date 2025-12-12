import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle, Clock, Sparkles, CreditCard, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { SiVenmo } from "react-icons/si";
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
    { value: "standard-30min", label: "Quick Foam Fun", price: "$200", duration: "30 min" },
    { value: "standard-1hr", label: "Classic Party Package", price: "$325", duration: "1 hour", popular: true },
    { value: "standard-2hr", label: "Extended Foam Experience", price: "$430", duration: "2 hours" }
  ],
  glow: [
    { value: "glow-30min", label: "Standard Glow Foam", price: "+$125", duration: "Add-on" },
    { value: "glow-1hr", label: "Extended Glow Foam", price: "+$200", duration: "Add-on" }
  ],
  genderReveal: [
    { value: "gender-reveal-30min", label: "Surprise in Style", price: "$300", duration: "30 min" },
    { value: "gender-reveal-1hr", label: "Extended Reveal Celebration", price: "$475", duration: "1 hour" }
  ]
};

const ALL_PACKAGES = [...PACKAGES.standard, ...PACKAGES.glow, ...PACKAGES.genderReveal];

const findPackageValueByLabel = (label: string): string => {
  const pkg = ALL_PACKAGES.find(p => p.label === label);
  return pkg ? pkg.value : "";
};

const VENMO_USERNAME = "joe4216";

type BookingStep = "details" | "payment";

export default function BookingModal({ open, onOpenChange, selectedPackage }: BookingModalProps) {
  const [step, setStep] = useState<BookingStep>("details");
  const [date, setDate] = useState<Date>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "venmo">("card");
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    customerName: "",
    email: "",
    phone: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
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
    if (open && selectedPackage) {
      const packageValue = findPackageValueByLabel(selectedPackage);
      if (packageValue) {
        setFormData(prev => ({ ...prev, packageType: packageValue }));
      }
    }
  }, [selectedPackage, open]);

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

  // Create booking and proceed to payment step
  const createBookingMutation = useMutation({
    mutationFn: async (booking: InsertBooking) => {
      const res = await apiRequest("POST", "/api/bookings", booking);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create booking");
      }
      return data;
    },
    onSuccess: (data: Booking) => {
      setBookingId(data.id);
      setStep("payment");
      toast({
        title: "Booking Details Saved",
        description: "Now choose your payment method to complete the booking.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message || "There was an error creating your booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Process Stripe payment
  const processStripeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", "/api/create-checkout-session-for-booking", { bookingId: id.toString() });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }
      return data;
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Process Venmo payment
  const processVenmoMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", "/api/process-venmo-booking", { bookingId: id.toString() });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process Venmo payment");
      }
      return data;
    },
    onSuccess: (data: { bookingId: number; amount: number; packageName: string; eventDate: string; eventTime: string; email: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      
      const note = encodeURIComponent(`Foam Works Party - Booking #${data.bookingId} - ${data.packageName}`);
      const venmoUrl = `https://venmo.com/${VENMO_USERNAME}?txn=pay&amount=${data.amount}&note=${note}`;
      
      toast({
        title: "Booking Created!",
        description: `Please complete your $${data.amount} payment via Venmo. Opening Venmo now...`,
      });
      
      window.open(venmoUrl, '_blank');
      
      const params = new URLSearchParams({
        booking_id: data.bookingId.toString(),
        amount: data.amount.toString(),
        package: data.packageName,
        date: data.eventDate,
        time: data.eventTime,
        email: data.email
      });
      window.location.href = `/venmo-booking-success?${params.toString()}`;
    },
    onError: () => {
      toast({
        title: "Payment Failed",
        description: "There was an error processing your Venmo payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDetailsSubmit = (e: React.FormEvent) => {
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

    const fullAddress = `${formData.streetAddress}, ${formData.city}, ${formData.state} ${formData.zipCode}`;
    
    const bookingData: InsertBooking = {
      customerName: formData.customerName,
      email: formData.email,
      phone: formData.phone,
      address: fullAddress,
      partySize: parseInt(formData.partySize),
      packageType: formData.packageType,
      eventDate: format(date, "yyyy-MM-dd"),
      eventTime: formData.eventTime,
      notes: formData.notes || null,
    };

    createBookingMutation.mutate(bookingData);
  };

  const handlePayment = () => {
    if (!bookingId) return;
    
    if (paymentMethod === "venmo") {
      processVenmoMutation.mutate(bookingId);
    } else {
      processStripeMutation.mutate(bookingId);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      customerName: "",
      email: "",
      phone: "",
      streetAddress: "",
      city: "",
      state: "",
      zipCode: "",
      partySize: "",
      packageType: "",
      eventTime: "",
      notes: ""
    });
    setDate(undefined);
    setCalendarOpen(false);
    setPaymentMethod("card");
    setStep("details");
    setBookingId(null);
  };

  const isPending = createBookingMutation.isPending || processStripeMutation.isPending || processVenmoMutation.isPending;

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
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
    formData.streetAddress.trim() !== "" &&
    formData.city.trim() !== "" &&
    formData.state.trim() !== "" &&
    formData.zipCode.trim() !== "" &&
    formData.packageType !== "" &&
    formData.eventTime !== "" &&
    date !== undefined;

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      <div className={`flex items-center gap-2 ${step === "details" ? "text-primary" : "text-muted-foreground"}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step === "details" ? "bg-primary text-primary-foreground" : 
          step === "payment" ? "bg-primary/20 text-primary" : "bg-muted"
        }`}>
          {step === "payment" ? <CheckCircle2 className="w-4 h-4" /> : "1"}
        </div>
        <span className="text-sm font-medium hidden sm:inline">Details</span>
      </div>
      
      <div className="w-8 h-px bg-border" />
      
      <div className={`flex items-center gap-2 ${step === "payment" ? "text-primary" : "text-muted-foreground"}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step === "payment" ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}>
          2
        </div>
        <span className="text-sm font-medium hidden sm:inline">Payment</span>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <form onSubmit={handleDetailsSubmit} className="space-y-6">
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
      
      <div className="space-y-4">
        <Label className="text-base font-semibold">Event Location *</Label>
        <div className="space-y-2">
          <Label htmlFor="street-address">Street Address *</Label>
          <Input
            id="street-address"
            value={formData.streetAddress}
            onChange={(e) => updateField('streetAddress', e.target.value)}
            placeholder="123 Main St"
            required
            data-testid="input-street-address"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2 col-span-2 md:col-span-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="City"
              required
              data-testid="input-city"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State *</Label>
            <Select 
              value={formData.state} 
              onValueChange={(value) => updateField('state', value)}
              required
            >
              <SelectTrigger data-testid="select-state">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AL">AL</SelectItem>
                <SelectItem value="AK">AK</SelectItem>
                <SelectItem value="AZ">AZ</SelectItem>
                <SelectItem value="AR">AR</SelectItem>
                <SelectItem value="CA">CA</SelectItem>
                <SelectItem value="CO">CO</SelectItem>
                <SelectItem value="CT">CT</SelectItem>
                <SelectItem value="DE">DE</SelectItem>
                <SelectItem value="FL">FL</SelectItem>
                <SelectItem value="GA">GA</SelectItem>
                <SelectItem value="HI">HI</SelectItem>
                <SelectItem value="ID">ID</SelectItem>
                <SelectItem value="IL">IL</SelectItem>
                <SelectItem value="IN">IN</SelectItem>
                <SelectItem value="IA">IA</SelectItem>
                <SelectItem value="KS">KS</SelectItem>
                <SelectItem value="KY">KY</SelectItem>
                <SelectItem value="LA">LA</SelectItem>
                <SelectItem value="ME">ME</SelectItem>
                <SelectItem value="MD">MD</SelectItem>
                <SelectItem value="MA">MA</SelectItem>
                <SelectItem value="MI">MI</SelectItem>
                <SelectItem value="MN">MN</SelectItem>
                <SelectItem value="MS">MS</SelectItem>
                <SelectItem value="MO">MO</SelectItem>
                <SelectItem value="MT">MT</SelectItem>
                <SelectItem value="NE">NE</SelectItem>
                <SelectItem value="NV">NV</SelectItem>
                <SelectItem value="NH">NH</SelectItem>
                <SelectItem value="NJ">NJ</SelectItem>
                <SelectItem value="NM">NM</SelectItem>
                <SelectItem value="NY">NY</SelectItem>
                <SelectItem value="NC">NC</SelectItem>
                <SelectItem value="ND">ND</SelectItem>
                <SelectItem value="OH">OH</SelectItem>
                <SelectItem value="OK">OK</SelectItem>
                <SelectItem value="OR">OR</SelectItem>
                <SelectItem value="PA">PA</SelectItem>
                <SelectItem value="RI">RI</SelectItem>
                <SelectItem value="SC">SC</SelectItem>
                <SelectItem value="SD">SD</SelectItem>
                <SelectItem value="TN">TN</SelectItem>
                <SelectItem value="TX">TX</SelectItem>
                <SelectItem value="UT">UT</SelectItem>
                <SelectItem value="VT">VT</SelectItem>
                <SelectItem value="VA">VA</SelectItem>
                <SelectItem value="WA">WA</SelectItem>
                <SelectItem value="WV">WV</SelectItem>
                <SelectItem value="WI">WI</SelectItem>
                <SelectItem value="WY">WY</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip-code">Zip Code *</Label>
            <Input
              id="zip-code"
              value={formData.zipCode}
              onChange={(e) => updateField('zipCode', e.target.value)}
              placeholder="12345"
              required
              data-testid="input-zip-code"
            />
          </div>
        </div>
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
                  if (selectedDate) {
                    setDate(selectedDate);
                    setCalendarOpen(false);
                  }
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
          onClick={handleCancel}
          disabled={isPending}
          data-testid="button-cancel-booking"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!isFormComplete || isPending}
          className={`gap-2 ${!isFormComplete ? "bg-muted text-muted-foreground hover:bg-muted" : ""}`}
          data-testid="button-continue-to-payment"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Continue to Payment
            </>
          )}
        </Button>
      </div>
    </form>
  );

  const renderPaymentStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <CreditCard className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Choose Payment Method</h3>
        <p className="text-muted-foreground">
          Choose your payment method to complete your booking
        </p>
      </div>
      
      <div className="space-y-3">
        <Label>Payment Method *</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMethod("card")}
            className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
              paymentMethod === "card"
                ? "border-primary bg-primary/5"
                : "border-border hover-elevate"
            }`}
            data-testid="payment-method-card"
          >
            <CreditCard className="w-5 h-5" />
            <div className="text-left">
              <div className="font-semibold">Card Payment</div>
              <div className="text-xs text-muted-foreground">Credit/Debit, Apple Pay</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("venmo")}
            className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
              paymentMethod === "venmo"
                ? "border-primary bg-primary/5"
                : "border-border hover-elevate"
            }`}
            data-testid="payment-method-venmo"
          >
            <SiVenmo className="w-5 h-5 text-[#3D95CE]" />
            <div className="text-left">
              <div className="font-semibold">Venmo</div>
              <div className="text-xs text-muted-foreground">@{VENMO_USERNAME}</div>
            </div>
          </button>
        </div>
      </div>
      
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Booking Summary:</strong><br />
          {formData.customerName} - {formData.email}<br />
          {date && format(date, "PPP")} at {formData.eventTime}<br />
          Package: {ALL_PACKAGES.find(p => p.value === formData.packageType)?.label}
        </AlertDescription>
      </Alert>
      
      <div className="flex gap-4 justify-center">
        <Button 
          variant="outline" 
          onClick={() => setStep("verification")}
          disabled={isPending}
          data-testid="button-back-to-verification"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={handlePayment}
          disabled={isPending}
          className="gap-2"
          data-testid="button-proceed-to-payment"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : paymentMethod === "venmo" ? (
            <>
              <SiVenmo className="w-4 h-4" />
              Pay with Venmo
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Continue to Payment
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-['Poppins']">Book Your Foam Party</DialogTitle>
          <DialogDescription>
            {step === "details" && "Fill out your details below to get started."}
            {step === "payment" && "Choose your payment method to complete your booking."}
          </DialogDescription>
        </DialogHeader>
        
        {renderStepIndicator()}
        
        {step === "details" && renderDetailsStep()}
        {step === "payment" && renderPaymentStep()}
      </DialogContent>
    </Dialog>
  );
}
