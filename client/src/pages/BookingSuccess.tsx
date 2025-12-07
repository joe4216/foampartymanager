import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, PartyPopper, Calendar, Clock, Mail } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Booking } from "@shared/schema";

export default function BookingSuccess() {
  const [, setLocation] = useLocation();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [verified, setVerified] = useState(false);

  const verifyMutation = useMutation({
    mutationFn: async ({ sessionId, bookingId }: { sessionId: string; bookingId: string }) => {
      const res = await apiRequest("POST", "/api/verify-payment", { sessionId, bookingId });
      return await res.json();
    },
    onSuccess: (data) => {
      setBooking(data.booking);
      setVerified(true);
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: () => {
      setVerified(true);
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const bookingId = params.get("booking_id");

    if (sessionId && bookingId) {
      verifyMutation.mutate({ sessionId, bookingId });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-['Poppins'] text-green-600">
            Payment Successful!
          </CardTitle>
          <CardDescription className="text-lg">
            Your foam party is officially booked! <PartyPopper className="inline w-5 h-5" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {booking && (
            <div className="bg-muted rounded-lg p-4 space-y-3 text-left">
              <h3 className="font-semibold text-lg">Booking Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Date: {booking.eventDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>Time: {booking.eventTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>Confirmation sent to: {booking.email}</span>
                </div>
              </div>
              {booking.amountPaid && (
                <div className="pt-2 border-t">
                  <span className="font-semibold">
                    Amount Paid: ${(booking.amountPaid / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-muted-foreground">
              You'll receive a confirmation email shortly. Our team will contact you before your event with additional details.
            </p>
            
            <Button 
              onClick={() => setLocation("/")}
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
