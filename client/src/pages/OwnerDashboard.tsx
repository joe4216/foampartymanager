import DashboardStats from "@/components/DashboardStats";
import VenmoVerificationQueue from "@/components/VenmoVerificationQueue";
import AllBookingsTable from "@/components/AllBookingsTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { Booking } from "@shared/schema";
import { Link } from "wouter";

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Poppins'] mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your foam party business</p>
        </div>
        <AllBookingsTable bookings={bookings} />
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
    </div>
  );
}
