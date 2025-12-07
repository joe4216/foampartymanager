import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CreditCard, ExternalLink, CheckCircle, AlertCircle, Loader2, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { StripeSettings } from "@shared/schema";

export default function PaymentsSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [connectError, setConnectError] = useState<string | null>(null);
  
  const { data: settings, isLoading } = useQuery<StripeSettings | null>({
    queryKey: ["/api/stripe/settings"],
  });

  const refreshMutationAuto = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/connect/refresh");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stripe/settings"] });
      setLocation("/owner/payments");
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true" || params.get("refresh") === "true") {
      refreshMutationAuto.mutate();
    }
  }, []);

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/connect/onboard");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to connect");
      }
      return data;
    },
    onSuccess: (data) => {
      setConnectError(null);
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      if (error.message.includes("Connect enabled") || error.message.includes("Connect not enabled")) {
        setConnectError(error.message);
      } else {
        toast({
          title: "Connection failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/connect/refresh");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stripe/settings"] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-muted-foreground">Loading payment settings...</div>
      </div>
    );
  }

  const isConnected = settings?.stripeAccountStatus === "active";
  const isPending = settings?.stripeAccountStatus === "pending" || settings?.stripeAccountStatus === "pending_verification";
  const isPendingVerification = settings?.stripeAccountStatus === "pending_verification";

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-['Poppins'] mb-2">Payment Settings</h1>
        <p className="text-muted-foreground">Connect your Stripe account to receive payments</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="font-['Poppins']">Stripe Account</CardTitle>
                <CardDescription>Receive payments directly to your bank account</CardDescription>
              </div>
            </div>
            {isConnected && (
              <Badge variant="default" className="gap-1" data-testid="badge-stripe-connected">
                <CheckCircle className="w-3 h-3" />
                Connected
              </Badge>
            )}
            {isPending && (
              <Badge variant="secondary" className="gap-1" data-testid="badge-stripe-pending">
                <AlertCircle className="w-3 h-3" />
                {isPendingVerification ? "Pending Verification" : "Setup Incomplete"}
              </Badge>
            )}
            {!isConnected && !isPending && (
              <Badge variant="outline" className="gap-1" data-testid="badge-stripe-not-connected">
                Not Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isConnected ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Your Stripe account is connected!</span>
                </div>
                {settings?.stripeAccountEmail && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-500">
                    Connected as: {settings.stripeAccountEmail}
                  </p>
                )}
                <p className="mt-2 text-sm text-muted-foreground">
                  All customer payments will be deposited directly to your connected bank account.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
                className="gap-2"
                data-testid="button-open-stripe-dashboard"
              >
                <ExternalLink className="w-4 h-4" />
                Open Stripe Dashboard
              </Button>
            </div>
          ) : isPending ? (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">
                    {isPendingVerification 
                      ? "Your account is being verified by Stripe" 
                      : "Complete your Stripe setup"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {isPendingVerification 
                    ? "Stripe is reviewing your information. This usually takes 1-2 business days. You'll be able to receive payments once verified."
                    : "Your account setup is incomplete. Please finish setting up your Stripe account to start receiving payments."}
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                {!isPendingVerification && (
                  <Button
                    onClick={() => connectMutation.mutate()}
                    disabled={connectMutation.isPending}
                    className="gap-2"
                    data-testid="button-continue-stripe-setup"
                  >
                    {connectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Continue Setup
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => refreshMutation.mutate()}
                  disabled={refreshMutation.isPending}
                  className="gap-2"
                  data-testid="button-refresh-stripe-status"
                >
                  {refreshMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Check Status
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {connectError && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">Stripe Connect Setup Required</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {connectError}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-2"
                    onClick={() => window.open("https://dashboard.stripe.com/connect/accounts/overview", "_blank")}
                    data-testid="button-open-stripe-connect"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Stripe Connect Dashboard
                  </Button>
                </div>
              )}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Why connect Stripe?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>- Accept credit/debit cards, Apple Pay, and Google Pay</li>
                  <li>- Get paid directly to your bank account</li>
                  <li>- Secure payment processing with fraud protection</li>
                  <li>- Easy setup takes just a few minutes</li>
                </ul>
              </div>
              <Button
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
                size="lg"
                className="gap-2"
                data-testid="button-connect-stripe"
              >
                {connectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <CreditCard className="w-4 h-4" />
                Connect with Stripe
              </Button>
              <p className="text-xs text-muted-foreground">
                You'll be redirected to Stripe to create or connect your account securely.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
