import DashboardStats from "@/components/DashboardStats";
import VenmoVerificationQueue from "@/components/VenmoVerificationQueue";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { Booking } from "@shared/schema";
import { Link } from "wouter";
import { CreditCard, Mail, Bot, Database, Server, ExternalLink } from "lucide-react";

const packagePrices: Record<string, number> = {
  "Basic Party": 199,
  "Standard Party": 299,
  "Premium Party": 499,
};

export default function OwnerDashboard() {
  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    confirmed: "default",
    completed: "outline",
    cancelled: "destructive",
  };

  const confirmedBookings = bookings.filter(b => b.status === "confirmed" || b.status === "pending");
  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (packagePrices[b.packageType] || 0), 0);
  const totalGuests = bookings.reduce((sum, b) => sum + b.partySize, 0);
  const upcomingEvents = bookings.filter(b => 
    new Date(b.eventDate) >= new Date() && (b.status === "confirmed" || b.status === "pending")
  ).length;

  const recentBookings = bookings
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 5)
    .map(b => ({
      ...b,
      revenue: packagePrices[b.packageType] || 0
    }));

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-['Poppins'] mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your foam party business</p>
      </div>

      <DashboardStats
        totalBookings={bookings.length}
        upcomingEvents={upcomingEvents}
        totalRevenue={totalRevenue}
        totalGuests={totalGuests}
      />

      <VenmoVerificationQueue />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle className="font-['Poppins']">Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {recentBookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No bookings yet</p>
            ) : (
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                    data-testid={`recent-booking-${booking.id}`}
                  >
                    <div className="flex-1">
                      <div className="font-semibold mb-1">{booking.customerName}</div>
                      <div className="text-sm text-muted-foreground">
                        {booking.packageType} - {booking.eventDate}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-primary">${booking.revenue}</div>
                      </div>
                      <Badge variant={statusVariants[booking.status] || "secondary"}>
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle className="font-['Poppins']">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-3 h-full flex flex-col justify-between">
              <Link href="/owner/calendar">
                <div className="block w-full p-4 text-left border rounded-lg hover-elevate cursor-pointer" data-testid="button-quick-calendar">
                  <div className="font-semibold mb-1">View Calendar</div>
                  <div className="text-sm text-muted-foreground">Check upcoming events</div>
                </div>
              </Link>
              
              <Link href="/owner/kanban">
                <div className="block w-full p-4 text-left border rounded-lg hover-elevate cursor-pointer" data-testid="button-quick-kanban">
                  <div className="font-semibold mb-1">Manage Bookings</div>
                  <div className="text-sm text-muted-foreground">Update booking status</div>
                </div>
              </Link>
              
              <button
                className="w-full p-4 text-left border rounded-lg hover-elevate"
                onClick={() => console.log('Generate report')}
                data-testid="button-quick-report"
              >
                <div className="font-semibold mb-1">Generate Report</div>
                <div className="text-sm text-muted-foreground">View revenue analytics</div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-integrations">
        <CardHeader>
          <CardTitle className="font-['Poppins']">Integrations & Services</CardTitle>
          <CardDescription>Services powering your foam party business</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg" data-testid="integration-stripe">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Stripe</h3>
                  <p className="text-xs text-muted-foreground">Payment Processing</p>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Per transaction:</span>
                  <span className="font-medium">2.9% + $0.30</span>
                </div>
              </div>
              <a 
                href="https://dashboard.stripe.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary mt-3 hover:underline"
              >
                View Dashboard <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="p-4 border rounded-lg" data-testid="integration-resend">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Resend</h3>
                  <p className="text-xs text-muted-foreground">Email Service</p>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Free tier:</span>
                  <span className="font-medium">3,000 emails/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pro plan:</span>
                  <span className="font-medium">$20/month</span>
                </div>
              </div>
              <a 
                href="https://resend.com/domains" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary mt-3 hover:underline"
              >
                View Dashboard <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="p-4 border rounded-lg" data-testid="integration-openai">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Bot className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold">OpenAI</h3>
                  <p className="text-xs text-muted-foreground">AI Chatbot & Receipt Analysis</p>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Per request:</span>
                  <span className="font-medium">~$0.01-0.03</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model:</span>
                  <span className="font-medium">GPT-4o-mini</span>
                </div>
              </div>
              <a 
                href="https://platform.openai.com/usage" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary mt-3 hover:underline"
              >
                View Usage <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="p-4 border rounded-lg" data-testid="integration-neon">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                  <Database className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Neon</h3>
                  <p className="text-xs text-muted-foreground">PostgreSQL Database</p>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Free tier:</span>
                  <span className="font-medium">0.5 GB storage</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pro plan:</span>
                  <span className="font-medium">Usage-based</span>
                </div>
              </div>
              <a 
                href="https://console.neon.tech" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary mt-3 hover:underline"
              >
                View Console <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="p-4 border rounded-lg" data-testid="integration-railway">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Server className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Railway</h3>
                  <p className="text-xs text-muted-foreground">App Hosting</p>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hobby usage:</span>
                  <span className="font-medium">~$5/month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Includes:</span>
                  <span className="font-medium">SSL, Custom domain</span>
                </div>
              </div>
              <a 
                href="https://railway.app/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary mt-3 hover:underline"
              >
                View Dashboard <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
