import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, PartyPopper, DollarSign, AlertCircle, Calendar, Clock, Mail } from "lucide-react";
import { SiVenmo } from "react-icons/si";

const VENMO_USERNAME = "joe4216";

interface BookingData {
  bookingId: string;
  amount: string;
  packageName: string;
  eventDate: string;
  eventTime: string;
  email: string;
}

export default function VenmoBookingSuccess() {
  const [, setLocation] = useLocation();
  const [bookingData, setBookingData] = useState<BookingData | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data: BookingData = {
      bookingId: params.get("booking_id") || "",
      amount: params.get("amount") || "",
      packageName: params.get("package") || "",
      eventDate: params.get("date") || "",
      eventTime: params.get("time") || "",
      email: params.get("email") || "",
    };
    if (data.bookingId) {
      setBookingData(data);
    }
  }, []);

  const openVenmo = () => {
    if (bookingData) {
      const note = encodeURIComponent(`Foam Works Party - Booking #${bookingData.bookingId} - ${bookingData.packageName}`);
      const venmoUrl = `https://venmo.com/${VENMO_USERNAME}?txn=pay&amount=${bookingData.amount}&note=${note}`;
      window.open(venmoUrl, '_blank');
    }
  };

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="py-8">
            <p>Loading booking details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-['Poppins'] text-blue-600">
            Booking Created!
          </CardTitle>
          <CardDescription className="text-lg">
            Almost done! Complete your Venmo payment to confirm. <PartyPopper className="inline w-5 h-5" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold">
              <DollarSign className="w-6 h-6 text-primary" />
              <span>${bookingData.amount}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Send this amount to @{VENMO_USERNAME} on Venmo
            </p>
          </div>

          <div className="bg-muted rounded-lg p-4 space-y-3 text-left">
            <h3 className="font-semibold text-lg">Booking Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Date: {bookingData.eventDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Time: {bookingData.eventTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>Confirmation will be sent to: {bookingData.email}</span>
              </div>
            </div>
            <div className="pt-2 border-t text-sm">
              <span className="font-medium">Package: {bookingData.packageName}</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-left text-sm">
                <p className="font-semibold text-amber-800">Important:</p>
                <p className="text-amber-700">
                  Your booking will be confirmed once we receive your Venmo payment. 
                  Please include your booking number #{bookingData.bookingId} in the payment note.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={openVenmo}
              className="w-full gap-2 bg-[#3D95CE] hover:bg-[#2a7ab3]"
              size="lg"
              data-testid="button-open-venmo"
            >
              <SiVenmo className="w-5 h-5" />
              Open Venmo to Pay
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Venmo will open in a new tab. Send ${bookingData.amount} to @{VENMO_USERNAME}
            </p>

            <Button 
              onClick={() => setLocation("/")}
              variant="outline"
              className="w-full"
              data-testid="button-back-home"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
