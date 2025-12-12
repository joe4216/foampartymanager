import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, PartyPopper, DollarSign, AlertCircle, Calendar, Clock, Mail, Upload, Loader2, Camera } from "lucide-react";
import { SiVenmo } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";

const VENMO_USERNAME = "joe4216";

interface BookingData {
  bookingId: string;
  amount: string;
  packageName: string;
  eventDate: string;
  eventTime: string;
  email: string;
}

interface UploadResponse {
  success: boolean;
  receiptUrl: string;
  verified: boolean;
  analysis: {
    amount: number | null;
    expectedAmount?: number;
    confidence: string;
    message: string;
    needsManualReview: boolean;
  };
}

export default function VenmoBookingSuccess() {
  const [, setLocation] = useLocation();
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [step, setStep] = useState<"pay" | "upload" | "success" | "pending">("pay");
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      const res = await apiRequest("POST", "/api/venmo/upload-receipt", {
        bookingId: bookingData?.bookingId,
        imageBase64,
      });
      return await res.json() as UploadResponse;
    },
    onSuccess: (data) => {
      setUploadResult(data);
      if (data.verified) {
        setStep("success");
      } else {
        setStep("pending");
      }
    },
  });

  const openVenmo = () => {
    if (bookingData) {
      const note = encodeURIComponent(`Foam Works Party - Booking #${bookingData.bookingId} - ${bookingData.packageName}`);
      const venmoUrl = `https://venmo.com/${VENMO_USERNAME}?txn=pay&amount=${bookingData.amount}&note=${note}`;
      window.open(venmoUrl, '_blank');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      uploadMutation.mutate(base64);
    };
    reader.readAsDataURL(file);
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
      <Card className="w-full max-w-lg">
        {step === "pay" && (
          <>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <SiVenmo className="w-8 h-8 text-[#3D95CE]" />
              </div>
              <CardTitle className="text-2xl font-['Poppins']">
                Step 1: Pay via Venmo
              </CardTitle>
              <CardDescription className="text-base">
                Send payment to @{VENMO_USERNAME}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-center gap-2 text-3xl font-bold">
                  <DollarSign className="w-8 h-8 text-primary" />
                  <span>${bookingData.amount}</span>
                </div>
                <div className="text-sm text-muted-foreground text-center">
                  {bookingData.packageName}
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{bookingData.eventDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{bookingData.eventTime}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold">Include in payment note:</p>
                    <p className="font-mono bg-amber-100 px-2 py-1 rounded mt-1">
                      Booking #{bookingData.bookingId}
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
                
                <Button 
                  onClick={() => setStep("upload")}
                  variant="outline"
                  className="w-full gap-2"
                  size="lg"
                  data-testid="button-already-paid"
                >
                  <CheckCircle className="w-5 h-5" />
                  I've Already Paid - Upload Receipt
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {step === "upload" && (
          <>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <Camera className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-['Poppins']">
                Step 2: Upload Receipt
              </CardTitle>
              <CardDescription className="text-base">
                Upload a screenshot of your Venmo payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">Expected payment:</p>
                <div className="text-2xl font-bold">${bookingData.amount}</div>
              </div>

              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                  data-testid="input-file-receipt"
                />
                
                {uploadMutation.isPending ? (
                  <div className="space-y-3">
                    <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                    <p className="text-muted-foreground">Analyzing receipt...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Take a screenshot of your Venmo payment confirmation
                    </p>
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      size="lg"
                      data-testid="button-upload-receipt"
                    >
                      Choose Screenshot
                    </Button>
                  </div>
                )}
              </div>

              {uploadMutation.isError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
                  Failed to upload receipt. Please try again.
                </div>
              )}

              <Button 
                onClick={() => setStep("pay")}
                variant="ghost"
                className="w-full"
                disabled={uploadMutation.isPending}
              >
                Back to Payment
              </Button>
            </CardContent>
          </>
        )}

        {step === "success" && (
          <>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-['Poppins'] text-green-600">
                Payment Verified! <PartyPopper className="inline w-6 h-6" />
              </CardTitle>
              <CardDescription className="text-lg">
                Your booking is confirmed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-green-800 font-semibold text-lg">
                  Booking #{bookingData.bookingId}
                </p>
                <p className="text-green-700 text-sm mt-1">
                  {uploadResult?.analysis.message}
                </p>
              </div>

              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{bookingData.eventDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{bookingData.eventTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>Confirmation sent to {bookingData.email}</span>
                </div>
              </div>

              <Button 
                onClick={() => setLocation("/")}
                className="w-full"
                size="lg"
                data-testid="button-back-home"
              >
                Back to Home
              </Button>
            </CardContent>
          </>
        )}

        {step === "pending" && (
          <>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-10 h-10 text-amber-600" />
              </div>
              <CardTitle className="text-2xl font-['Poppins'] text-amber-600">
                Receipt Under Review
              </CardTitle>
              <CardDescription className="text-lg">
                We'll verify your payment shortly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-amber-800 text-sm">
                  {uploadResult?.analysis.message || "Your receipt has been uploaded. The owner will verify your payment and confirm your booking."}
                </p>
                {uploadResult?.analysis.amount && uploadResult?.analysis.expectedAmount && (
                  <div className="mt-3 text-sm">
                    <p className="text-amber-700">
                      Detected: <span className="font-semibold">${uploadResult.analysis.amount.toFixed(2)}</span>
                    </p>
                    <p className="text-amber-700">
                      Expected: <span className="font-semibold">${uploadResult.analysis.expectedAmount.toFixed(2)}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Your booking reference:</p>
                <p className="text-xl font-bold mt-1">#{bookingData.bookingId}</p>
              </div>

              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>You'll receive a confirmation email at {bookingData.email}</span>
                </div>
              </div>

              <Button 
                onClick={() => setLocation("/")}
                className="w-full"
                size="lg"
                data-testid="button-back-home"
              >
                Back to Home
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
