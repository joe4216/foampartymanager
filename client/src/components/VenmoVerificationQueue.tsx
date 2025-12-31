import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, DollarSign, AlertTriangle, Loader2, Clock, Calendar } from "lucide-react";
import { SiVenmo } from "react-icons/si";
import type { Booking } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function VenmoVerificationQueue() {
  const { toast } = useToast();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const { data: pendingBookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/venmo/pending"],
  });

  // Fetch all bookings to find pending status ones
  const { data: allBookings = [], isLoading: isLoadingAll } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  // Get bookings with "pending" status (not yet paid)
  const pendingStatusBookings = allBookings.filter(b => b.status === "pending");

  const verifyMutation = useMutation({
    mutationFn: async ({ bookingId, receivedAmount, verified, notes }: {
      bookingId: number;
      receivedAmount: string;
      verified: boolean;
      notes?: string;
    }) => {
      const res = await apiRequest("POST", "/api/venmo/verify", {
        bookingId,
        receivedAmount,
        verified,
        notes,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venmo/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setSelectedBooking(null);
      setReceivedAmount("");
      toast({
        title: "Payment Updated",
        description: "The booking status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update payment status.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (booking: Booking) => {
    const amount = receivedAmount || ((booking.expectedAmount || 0) / 100).toFixed(2);
    verifyMutation.mutate({
      bookingId: booking.id,
      receivedAmount: amount,
      verified: true,
      notes: "Manually verified by owner",
    });
  };

  const handleReject = (booking: Booking) => {
    verifyMutation.mutate({
      bookingId: booking.id,
      receivedAmount: "0",
      verified: false,
      notes: "Payment rejected by owner",
    });
  };

  if (isLoading || isLoadingAll) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (pendingBookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-['Poppins'] flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Pending Bookings
            {pendingStatusBookings.length > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingStatusBookings.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingStatusBookings.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No pending bookings awaiting payment
            </p>
          ) : (
            <div className="space-y-3">
              {pendingStatusBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="border rounded-lg p-3 space-y-2"
                  data-testid={`pending-booking-${booking.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{booking.customerName}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {booking.eventDate} at {booking.eventTime}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {booking.packageType}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        Pending
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        #{booking.id}
                      </div>
                    </div>
                  </div>
                  {booking.paymentMethod && (
                    <div className="text-xs text-muted-foreground">
                      Payment: {booking.paymentMethod === "venmo" ? "Venmo" : "Stripe"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-['Poppins'] flex items-center gap-2">
            <SiVenmo className="w-5 h-5 text-[#3D95CE]" />
            Pending Venmo Payments
            <Badge variant="secondary" className="ml-2">{pendingBookings.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingBookings.map((booking) => (
              <div
                key={booking.id}
                className="border rounded-lg p-4 space-y-3"
                data-testid={`venmo-pending-${booking.id}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{booking.customerName}</div>
                    <div className="text-sm text-muted-foreground">
                      {booking.packageType} - {booking.eventDate}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Booking #{booking.id}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      ${((booking.expectedAmount || 0) / 100).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">expected</div>
                  </div>
                </div>

                {booking.verificationNotes && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-2 text-sm text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{booking.verificationNotes}</span>
                  </div>
                )}

                {booking.receivedAmount !== null && booking.receivedAmount > 0 && (
                  <div className="bg-muted rounded p-2 text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>AI detected: ${(booking.receivedAmount / 100).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {booking.receiptImageUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowReceiptModal(true);
                      }}
                      data-testid={`button-view-receipt-${booking.id}`}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Receipt
                    </Button>
                  )}
                  
                  <div className="flex-1" />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedBooking(booking);
                      setReceivedAmount(((booking.expectedAmount || 0) / 100).toFixed(2));
                    }}
                    data-testid={`button-verify-${booking.id}`}
                  >
                    Verify Manually
                  </Button>
                  
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleApprove(booking)}
                    disabled={verifyMutation.isPending}
                    data-testid={`button-approve-${booking.id}`}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleReject(booking)}
                    disabled={verifyMutation.isPending}
                    data-testid={`button-reject-${booking.id}`}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Venmo Receipt - Booking #{selectedBooking?.id}</DialogTitle>
          </DialogHeader>
          {selectedBooking?.receiptImageUrl && (
            <div className="max-h-[60vh] overflow-auto">
              <img 
                src={selectedBooking.receiptImageUrl} 
                alt="Venmo Receipt" 
                className="w-full rounded-lg"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiptModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedBooking !== null && !showReceiptModal} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Payment - Booking #{selectedBooking?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Expected amount:</p>
              <p className="text-xl font-bold">${((selectedBooking?.expectedAmount || 0) / 100).toFixed(2)}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium">Actual Amount Received ($)</label>
              <Input
                type="number"
                step="0.01"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                placeholder="Enter amount received"
                className="mt-1"
                data-testid="input-received-amount"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedBooking(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedBooking && handleApprove(selectedBooking)}
              disabled={verifyMutation.isPending || !receivedAmount}
            >
              {verifyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-1" />
              )}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
