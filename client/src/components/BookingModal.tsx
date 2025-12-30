import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle, Clock, Sparkles, CreditCard, ArrowLeft, CheckCircle2, Loader2, Info, Upload, Camera, MessageCircle, MapPin, Car } from "lucide-react";
import { SiVenmo } from "react-icons/si";
import { format } from "date-fns";
import { useState, useEffect, useMemo, useCallback } from "react";
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
const MAX_PARTY_SIZE = 500;
const MIN_ADVANCE_HOURS = 48;

// Package prices in cents (matches backend)
const PACKAGE_PRICES: Record<string, number> = {
  "standard-30min": 20000,
  "standard-1hr": 32500,
  "standard-2hr": 43000,
  "glow-30min": 12500,
  "glow-1hr": 20000,
  "gender-reveal-30min": 30000,
  "gender-reveal-1hr": 47500,
};

interface DistanceInfo {
  distanceMiles: number;
  travelFeeCents: number;
  travelFeeDollars: number;
  freeMiles: number;
  extraMiles: number;
  pricePerMile: number;
}

// Phone number formatting helper
const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

// Get minimum bookable date (48 hours from now)
// We add 48 hours, then if not already at start of day, move to the NEXT day
const getMinBookableDate = (): Date => {
  const now = new Date();
  const minDateTime = new Date(now.getTime() + MIN_ADVANCE_HOURS * 60 * 60 * 1000);
  // Set to start of the day that is at least 48 hours away
  // If 48 hours from now is 8 PM on Dec 23, the earliest bookable day is Dec 24
  const minDate = new Date(minDateTime);
  minDate.setHours(0, 0, 0, 0);
  // If we rolled back in time, add a day
  if (minDate.getTime() < minDateTime.getTime()) {
    minDate.setDate(minDate.getDate() + 1);
  }
  return minDate;
};

type BookingStep = "details" | "payment";

export default function BookingModal({ open, onOpenChange, selectedPackage }: BookingModalProps) {
  const [step, setStep] = useState<BookingStep>("details");
  const [date, setDate] = useState<Date>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "venmo">("card");
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [showVenmoInstructions, setShowVenmoInstructions] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    email: "",
    confirmEmail: "",
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

  const [pendingBookingFound, setPendingBookingFound] = useState<{
    id: number;
    customerName: string;
    email: string;
    phone: string;
    address: string;
    partySize: number;
    packageType: string;
    eventDate: string;
    eventTime: string;
    notes: string | null;
  } | null>(null);
  const [lookupChecked, setLookupChecked] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  
  // Distance-based pricing state
  const [distanceInfo, setDistanceInfo] = useState<DistanceInfo | null>(null);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [distanceError, setDistanceError] = useState<string | null>(null);

  // Calculate total price including travel fee
  const packagePriceCents = formData.packageType ? (PACKAGE_PRICES[formData.packageType] || 0) : 0;
  const travelFeeCents = distanceInfo?.travelFeeCents || 0;
  const totalPriceCents = packagePriceCents + travelFeeCents;
  const packagePriceDollars = packagePriceCents / 100;
  const totalPriceDollars = totalPriceCents / 100;

  // Calculate distance when address is complete
  const calculateDistance = useCallback(async () => {
    const { streetAddress, city, state, zipCode } = formData;
    
    // Only calculate if all address fields are filled
    if (!streetAddress.trim() || !city.trim() || !state || !zipCode.trim() || !/^\d{5}$/.test(zipCode.trim())) {
      return;
    }
    
    const fullAddress = `${streetAddress}, ${city}, ${state} ${zipCode}`;
    
    setIsCalculatingDistance(true);
    setDistanceError(null);
    
    try {
      const res = await apiRequest("POST", "/api/calculate-distance", { address: fullAddress });
      const data = await res.json();
      
      if (!res.ok) {
        setDistanceError(data.error || "Could not calculate distance");
        setDistanceInfo(null);
        return;
      }
      
      setDistanceInfo(data);
    } catch (error) {
      console.error("Distance calculation error:", error);
      setDistanceError("Could not calculate distance. Please check your address.");
      setDistanceInfo(null);
    } finally {
      setIsCalculatingDistance(false);
    }
  }, [formData.streetAddress, formData.city, formData.state, formData.zipCode]);

  // Calculate distance when zip code is complete (5 digits)
  const handleZipCodeBlur = () => {
    if (formData.zipCode.length === 5 && formData.streetAddress && formData.city && formData.state) {
      calculateDistance();
    }
  };

  const { data: existingBookings = [], refetch } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: open,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (open) {
      refetch();
      setPendingBookingFound(null);
      setLookupChecked(false);
    }
  }, [open, refetch]);

  // Look up pending booking when email is entered
  const lookupPendingBooking = async (email: string, phone: string) => {
    if (!email && !phone) return;
    if (lookupChecked) return;
    
    const phoneDigits = phone.replace(/\D/g, '');
    if (!email.includes('@') && phoneDigits.length !== 10) return;
    
    setIsLookingUp(true);
    try {
      const res = await apiRequest("POST", "/api/bookings/lookup-pending", { email, phone });
      const data = await res.json();
      
      setLookupChecked(true);
      
      if (data.found && data.booking) {
        setPendingBookingFound(data.booking);
      }
    } catch (error) {
      console.error("Error looking up pending booking:", error);
    } finally {
      setIsLookingUp(false);
    }
  };

  // Lookup on email blur
  const handleEmailBlur = () => {
    if (formData.email.includes('@') && !lookupChecked) {
      lookupPendingBooking(formData.email, formData.phone);
    }
  };

  // Lookup on phone blur
  const handlePhoneBlur = () => {
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length === 10 && !lookupChecked) {
      lookupPendingBooking(formData.email, formData.phone);
    }
  };

  // Reset lookup flag when email or phone changes
  const handleEmailChange = (value: string) => {
    updateField('email', value);
    if (lookupChecked) {
      setLookupChecked(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    updateField('phone', formatPhoneNumber(value));
    if (lookupChecked) {
      setLookupChecked(false);
    }
  };

  // Pre-fill form from pending booking
  const handleUsePendingBooking = () => {
    if (!pendingBookingFound) return;
    
    const addressParts = pendingBookingFound.address?.split(', ') || [];
    let streetAddress = '', city = '', stateZip = '';
    if (addressParts.length >= 3) {
      streetAddress = addressParts[0];
      city = addressParts[1];
      stateZip = addressParts[2];
    } else if (addressParts.length === 2) {
      streetAddress = addressParts[0];
      stateZip = addressParts[1];
    } else {
      streetAddress = pendingBookingFound.address || '';
    }
    
    const stateZipParts = stateZip.split(' ');
    const state = stateZipParts[0] || '';
    const zipCode = stateZipParts[1] || '';
    
    setFormData({
      customerName: pendingBookingFound.customerName || '',
      email: pendingBookingFound.email || '',
      confirmEmail: pendingBookingFound.email || '',
      phone: formatPhoneNumber(pendingBookingFound.phone || ''),
      streetAddress,
      city,
      state,
      zipCode,
      partySize: pendingBookingFound.partySize?.toString() || '',
      packageType: pendingBookingFound.packageType || '',
      eventTime: pendingBookingFound.eventTime || '',
      notes: pendingBookingFound.notes || ''
    });
    
    if (pendingBookingFound.eventDate) {
      setDate(new Date(pendingBookingFound.eventDate + 'T00:00:00'));
    }
    
    setBookingId(pendingBookingFound.id);
    setPendingBookingFound(null);
    
    toast({
      title: "Booking Found!",
      description: "We found your previous booking. Your information has been filled in. Please proceed to payment.",
    });
  };

  const handleDismissPendingBooking = () => {
    setPendingBookingFound(null);
    // Reset lookup so customer can search again if they correct their info
    setLookupChecked(false);
  };

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
      .filter(b => b.status === "confirmed")
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
      const res = await apiRequest("POST", "/api/create-checkout-session-for-booking", { 
        bookingId: id.toString(),
        distanceMiles: distanceInfo?.distanceMiles,
        travelFeeCents: distanceInfo?.travelFeeCents || 0
      });
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
      const res = await apiRequest("POST", "/api/process-venmo-booking", { 
        bookingId: id.toString(),
        distanceMiles: distanceInfo?.distanceMiles,
        travelFeeCents: distanceInfo?.travelFeeCents || 0
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process Venmo payment");
      }
      return data;
    },
    onSuccess: (data: { bookingId: number; amount: number; packageName: string; eventDate: string; eventTime: string; email: string; travelFee?: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      
      const note = encodeURIComponent(`Foam Works Party - Booking #${data.bookingId} - ${data.packageName}${data.travelFee && data.travelFee > 0 ? ` + Travel` : ''}`);
      const venmoUrl = `https://venmo.com/${VENMO_USERNAME}?txn=pay&amount=${data.amount}&note=${note}`;
      
      toast({
        title: "Booking Created!",
        description: `Please complete your $${data.amount.toFixed(2)} payment via Venmo. Opening Venmo now...`,
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
    
    // If we already have a booking ID (from pending booking lookup), go straight to payment
    if (bookingId) {
      setStep("payment");
      toast({
        title: "Ready for Payment",
        description: "Your booking details are saved. Choose your payment method to complete.",
      });
      return;
    }
    
    // Get all validation errors
    const errors = getValidationErrors();
    
    // Check minimum advance booking if date is selected
    if (date) {
      const minDate = getMinBookableDate();
      if (date < minDate) {
        errors.push(`Bookings require at least ${MIN_ADVANCE_HOURS} hours advance notice`);
      }
    }
    
    // If there are errors, show them in a toast
    if (errors.length > 0) {
      toast({
        title: "Please fix the following:",
        description: (
          <ul className="list-disc pl-4 mt-2 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        ),
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
      eventDate: format(date!, "yyyy-MM-dd"),
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
      confirmEmail: "",
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
    setDistanceInfo(null);
    setDistanceError(null);
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

  // Validation helpers
  const phoneDigits = formData.phone.replace(/\D/g, '');
  const isPhoneValid = phoneDigits.length === 10;
  const isZipValid = /^\d{5}$/.test(formData.zipCode.trim());
  const isEmailMatch = formData.email.trim().toLowerCase() === formData.confirmEmail.trim().toLowerCase();
  const partySizeNum = parseInt(formData.partySize) || 0;
  const isPartySizeValid = partySizeNum >= 1 && partySizeNum <= MAX_PARTY_SIZE;

  // Get list of validation errors
  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.customerName.trim()) errors.push("Full name is required");
    if (!formData.phone.trim()) errors.push("Phone number is required");
    else if (!isPhoneValid) errors.push("Phone number must be 10 digits");
    if (!formData.email.trim()) errors.push("Email is required");
    if (!formData.confirmEmail.trim()) errors.push("Please confirm your email");
    else if (!isEmailMatch) errors.push("Email addresses don't match");
    if (!formData.partySize.trim()) errors.push("Party size is required");
    else if (!isPartySizeValid) {
      if (partySizeNum < 1) errors.push("Party size must be at least 1");
      else errors.push(`Party size cannot exceed ${MAX_PARTY_SIZE} guests`);
    }
    if (!formData.streetAddress.trim()) errors.push("Street address is required");
    if (!formData.city.trim()) errors.push("City is required");
    if (!formData.state.trim()) errors.push("State is required");
    if (!formData.zipCode.trim()) errors.push("Zip code is required");
    else if (!isZipValid) errors.push("Zip code must be 5 digits");
    if (!formData.packageType) errors.push("Please select a package");
    if (!date) errors.push("Please select an event date");
    if (!formData.eventTime) errors.push("Please select an event time");
    
    return errors;
  };

  const isFormComplete = getValidationErrors().length === 0;

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
      {pendingBookingFound && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="flex flex-col gap-3">
            <div>
              <span className="font-medium text-blue-800 dark:text-blue-200">Welcome back!</span>
              <span className="text-blue-700 dark:text-blue-300"> We found your incomplete booking from {pendingBookingFound.eventDate}. Would you like to continue where you left off?</span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleUsePendingBooking}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-use-pending-booking"
              >
                Yes, Fill My Info
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDismissPendingBooking}
                data-testid="button-dismiss-pending-booking"
              >
                Start Fresh
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
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
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onBlur={handlePhoneBlur}
            placeholder="(555) 123-4567"
            required
            data-testid="input-phone"
            className={formData.phone && !isPhoneValid ? "border-red-500" : ""}
          />
          {formData.phone && !isPhoneValid && (
            <p className="text-xs text-red-500">Please enter a valid 10-digit phone number</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={handleEmailBlur}
              placeholder="john@example.com"
              required
              data-testid="input-email"
            />
            {isLookingUp && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirm-email">Confirm Email *</Label>
          <Input
            id="confirm-email"
            type="email"
            value={formData.confirmEmail}
            onChange={(e) => updateField('confirmEmail', e.target.value)}
            placeholder="john@example.com"
            required
            data-testid="input-confirm-email"
            className={formData.confirmEmail && !isEmailMatch ? "border-red-500" : ""}
          />
          {formData.confirmEmail && !isEmailMatch && (
            <p className="text-xs text-red-500">Email addresses must match</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="party-size">Party Size * <span className="text-muted-foreground text-xs">(max {MAX_PARTY_SIZE})</span></Label>
          <Input
            id="party-size"
            type="number"
            value={formData.partySize}
            onChange={(e) => updateField('partySize', e.target.value)}
            placeholder="50"
            min="1"
            max={MAX_PARTY_SIZE}
            required
            data-testid="input-party-size"
            className={formData.partySize && !isPartySizeValid ? "border-red-500" : ""}
          />
          {formData.partySize && !isPartySizeValid && (
            <p className="text-xs text-red-500">
              {parseInt(formData.partySize) > MAX_PARTY_SIZE 
                ? `Maximum ${MAX_PARTY_SIZE} guests` 
                : "Please enter at least 1 guest"}
            </p>
          )}
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
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 5);
                updateField('zipCode', digits);
                // Reset distance info when address changes
                if (distanceInfo) {
                  setDistanceInfo(null);
                }
              }}
              onBlur={handleZipCodeBlur}
              placeholder="12345"
              required
              data-testid="input-zip-code"
              className={formData.zipCode && !isZipValid ? "border-red-500" : ""}
              maxLength={5}
            />
            {formData.zipCode && !isZipValid && (
              <p className="text-xs text-red-500">Please enter a valid 5-digit zip code</p>
            )}
          </div>
        </div>
        
        {/* Distance and Travel Fee Display */}
        {isCalculatingDistance && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Calculating distance...
          </div>
        )}
        
        {distanceError && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{distanceError}</AlertDescription>
          </Alert>
        )}
        
        {distanceInfo && !isCalculatingDistance && (
          <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span><strong>{distanceInfo.distanceMiles} miles</strong> from our base location</span>
            </div>
            {distanceInfo.travelFeeCents > 0 ? (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <Car className="w-4 h-4" />
                <span>Travel fee: <strong>${distanceInfo.travelFeeDollars.toFixed(2)}</strong> ({distanceInfo.extraMiles} miles beyond {distanceInfo.freeMiles} free miles @ ${distanceInfo.pricePerMile}/mile)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>No travel fee! Within {distanceInfo.freeMiles} free miles</span>
              </div>
            )}
          </div>
        )}
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
                  const minDate = getMinBookableDate();
                  const isTooSoon = checkDate < minDate;
                  const dateString = format(checkDate, "yyyy-MM-dd");
                  const isFullyBooked = fullyBookedDates.has(dateString);
                  return isTooSoon || isFullyBooked;
                }}
                modifiers={{
                  partiallyBooked: (checkDate) => {
                    const minDate = getMinBookableDate();
                    if (checkDate < minDate) return false;
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
          disabled={isPending}
          className="gap-2"
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

      <Alert className="border-green-500 bg-green-50 dark:bg-green-950/30">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <strong>Time slot reserved!</strong> Your slot for {date && format(date, "PPP")} at {formData.eventTime} is being held. Complete payment to confirm your booking.
        </AlertDescription>
      </Alert>
      
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
            onClick={() => {
              setPaymentMethod("venmo");
              setShowVenmoInstructions(true);
            }}
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
        
        {paymentMethod === "venmo" && (
          <button
            type="button"
            onClick={() => setShowVenmoInstructions(true)}
            className="text-sm text-primary flex items-center gap-1 mt-2"
            data-testid="button-venmo-instructions"
          >
            <Info className="w-3 h-3" />
            View Venmo payment instructions
          </button>
        )}
      </div>
      
      <div className="border rounded-lg p-4 space-y-4">
        <div className="font-semibold text-sm">Booking Summary</div>
        <div className="text-sm space-y-1 text-muted-foreground">
          <div>{formData.customerName} - {formData.email}</div>
          <div>{date && format(date, "PPP")} at {formData.eventTime}</div>
        </div>
        
        <div className="border-t pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span>{ALL_PACKAGES.find(p => p.value === formData.packageType)?.label}</span>
            <span>${packagePriceDollars.toFixed(2)}</span>
          </div>
          
          {distanceInfo && distanceInfo.travelFeeCents > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Car className="w-3 h-3" />
                Travel fee ({distanceInfo.distanceMiles} mi - {distanceInfo.extraMiles} mi extra)
              </span>
              <span>${distanceInfo.travelFeeDollars.toFixed(2)}</span>
            </div>
          )}
          
          {distanceInfo && distanceInfo.travelFeeCents === 0 && (
            <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Travel fee (within {distanceInfo.freeMiles} free miles)
              </span>
              <span>$0.00</span>
            </div>
          )}
          
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-lg">${totalPriceDollars.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex gap-4 justify-center">
        <Button 
          variant="outline" 
          onClick={() => setStep("details")}
          disabled={isPending}
          data-testid="button-back-to-details"
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
    <>
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

      <Dialog open={showVenmoInstructions} onOpenChange={setShowVenmoInstructions}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-['Poppins'] flex items-center gap-2">
              <SiVenmo className="w-6 h-6 text-[#3D95CE]" />
              Venmo Payment Instructions
            </DialogTitle>
            <DialogDescription>
              Follow these steps to complete your payment
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
              <div>
                <p className="font-semibold">Send payment on Venmo</p>
                <p className="text-sm text-muted-foreground">Open Venmo and send <strong>${totalPriceDollars.toFixed(2)}</strong> to <strong>@{VENMO_USERNAME}</strong></p>
                {distanceInfo && distanceInfo.travelFeeCents > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">(Package: ${packagePriceDollars.toFixed(2)} + Travel fee: ${distanceInfo.travelFeeDollars.toFixed(2)})</p>
                )}
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
              <div>
                <p className="font-semibold">Take a screenshot</p>
                <p className="text-sm text-muted-foreground">Screenshot the Venmo payment confirmation showing the completed transaction</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
              <div>
                <p className="font-semibold">Upload your receipt</p>
                <p className="text-sm text-muted-foreground">Use our chatbot to upload your screenshot for instant verification</p>
              </div>
            </div>
            
            <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/30">
              <MessageCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <strong>Quick tip:</strong> After paying, click the chat bubble in the bottom-right corner and upload your receipt screenshot. Our AI will verify it instantly!
              </AlertDescription>
            </Alert>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowVenmoInstructions(false)} data-testid="button-close-venmo-instructions">
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
