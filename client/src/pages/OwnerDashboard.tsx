import DashboardStats from "@/components/DashboardStats";
import VenmoVerificationQueue from "@/components/VenmoVerificationQueue";
import AllBookingsTable from "@/components/AllBookingsTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { Booking } from "@shared/schema";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from "date-fns";
import { Calendar, ClipboardList, TrendingUp, Users, PartyPopper, DollarSign } from "lucide-react";

const packagePrices: Record<string, number> = {
  "Basic Party": 199,
  "Standard Party": 299,
  "Premium Party": 499,
  "standard-1hr": 199,
  "standard-2hr": 299,
  "premium-2hr": 399,
  "premium-3hr": 499,
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

  const confirmedBookings = bookings.filter(b => b.status === "confirmed" || b.status === "completed");
  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (packagePrices[b.packageType] || 0), 0);
  const totalGuests = confirmedBookings.reduce((sum, b) => sum + b.partySize, 0);
  const upcomingEvents = bookings.filter(b => 
    new Date(b.eventDate) >= new Date() && b.status === "confirmed"
  ).length;

  const recentBookings = bookings
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 5)
    .map(b => ({
      ...b,
      revenue: packagePrices[b.packageType] || 0
    }));

  const getRevenueChartData = () => {
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 5);
    const months = eachMonthOfInterval({
      start: startOfMonth(sixMonthsAgo),
      end: endOfMonth(now)
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthlyRevenue = confirmedBookings
        .filter(b => {
          const eventDate = parseISO(b.eventDate);
          return eventDate >= monthStart && eventDate <= monthEnd;
        })
        .reduce((sum, b) => sum + (packagePrices[b.packageType] || 0), 0);

      const monthlyBookings = confirmedBookings.filter(b => {
        const eventDate = parseISO(b.eventDate);
        return eventDate >= monthStart && eventDate <= monthEnd;
      }).length;

      return {
        month: format(month, "MMM"),
        fullMonth: format(month, "MMMM yyyy"),
        revenue: monthlyRevenue,
        bookings: monthlyBookings
      };
    });
  };

  const chartData = getRevenueChartData();
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 100);

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <PartyPopper className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-['Poppins']">Dashboard</h1>
          </div>
          <p className="text-muted-foreground">Overview of your foam party business</p>
        </div>
        <AllBookingsTable bookings={bookings} />
      </div>

      <DashboardStats
        totalBookings={confirmedBookings.length}
        upcomingEvents={upcomingEvents}
        totalRevenue={totalRevenue}
        totalGuests={totalGuests}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-['Poppins'] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Revenue Overview
                </CardTitle>
                <CardDescription className="mt-1">Monthly revenue for the last 6 months</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">${totalRevenue.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Revenue</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => `$${value}`}
                    domain={[0, maxRevenue * 1.2]}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                    labelFormatter={(label, payload) => payload[0]?.payload?.fullMonth || label}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 pt-4 border-t">
              {chartData.slice(-3).map((data) => (
                <div key={data.month} className="text-center">
                  <div className="text-lg font-bold">${data.revenue.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{data.fullMonth}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="font-['Poppins'] flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Manage your business</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3 pt-4">
            <Link href="/owner/calendar">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4" data-testid="button-quick-calendar">
                <Calendar className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">View Calendar</div>
                  <div className="text-xs text-muted-foreground">Check upcoming events</div>
                </div>
              </Button>
            </Link>
            
            <Link href="/owner/kanban">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4" data-testid="button-quick-kanban">
                <ClipboardList className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Manage Bookings</div>
                  <div className="text-xs text-muted-foreground">Update booking status</div>
                </div>
              </Button>
            </Link>

            <div className="mt-auto pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{upcomingEvents}</div>
                  <div className="text-xs text-muted-foreground">Upcoming</div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{confirmedBookings.length}</div>
                  <div className="text-xs text-muted-foreground">Confirmed</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <VenmoVerificationQueue />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-['Poppins'] flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Recent Bookings
              </CardTitle>
              <CardDescription className="mt-1">Latest customer bookings</CardDescription>
            </div>
            <Link href="/owner/kanban">
              <Button variant="outline" size="sm" data-testid="button-view-all-bookings">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {recentBookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <PartyPopper className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No bookings yet</p>
              <p className="text-sm">Bookings will appear here once customers start booking</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover-elevate transition-all"
                  data-testid={`recent-booking-${booking.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">{booking.customerName}</div>
                      <div className="text-sm text-muted-foreground">
                        {booking.packageType} - {format(parseISO(booking.eventDate), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold text-primary">${booking.revenue}</div>
                      <div className="text-xs text-muted-foreground">{booking.partySize} guests</div>
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
    </div>
  );
}
