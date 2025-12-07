import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { XCircle, ArrowLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function BookingCancelled() {
  const [, setLocation] = useLocation();

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await apiRequest("DELETE", `/api/bookings/${bookingId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get("booking_id");

    if (bookingId) {
      cancelMutation.mutate(bookingId);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-destructive/5 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-['Poppins'] text-red-600">
            Payment Cancelled
          </CardTitle>
          <CardDescription className="text-lg">
            Your booking was not completed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Don't worry! No charges were made to your card. Your time slot has been released and is available for booking again.
            </p>
            <p className="text-muted-foreground">
              If you'd like to try again or have any questions, feel free to start a new booking or contact us.
            </p>
            
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => setLocation("/")}
                className="w-full"
                data-testid="button-try-again"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
