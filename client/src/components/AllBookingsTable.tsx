import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table2, Search, X } from "lucide-react";
import type { Booking } from "@shared/schema";

interface AllBookingsTableProps {
  bookings: Booking[];
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  completed: "outline",
  cancelled: "destructive",
};

export default function AllBookingsTable({ bookings }: AllBookingsTableProps) {
  const [open, setOpen] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchId, setSearchId] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesName = booking.customerName.toLowerCase().includes(searchName.toLowerCase());
      const matchesEmail = booking.email.toLowerCase().includes(searchEmail.toLowerCase());
      const matchesPhone = booking.phone.includes(searchPhone);
      const matchesId = searchId === "" || booking.id.toString() === searchId;
      const matchesStatus = statusFilter === "all" || booking.status === statusFilter;

      return matchesName && matchesEmail && matchesPhone && matchesId && matchesStatus;
    });
  }, [bookings, searchName, searchEmail, searchPhone, searchId, statusFilter]);

  const clearFilters = () => {
    setSearchName("");
    setSearchEmail("");
    setSearchPhone("");
    setSearchId("");
    setStatusFilter("all");
  };

  const hasFilters = searchName || searchEmail || searchPhone || searchId || statusFilter !== "all";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          data-testid="button-open-bookings-table"
          title="View All Bookings"
        >
          <Table2 className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-['Poppins']">All Bookings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-3 py-4 border-b">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="pl-9"
              data-testid="input-filter-name"
            />
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="pl-9"
              data-testid="input-filter-email"
            />
          </div>
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by phone..."
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="pl-9"
              data-testid="input-filter-phone"
            />
          </div>
          <div className="w-[120px]">
            <Input
              placeholder="Booking #"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value.replace(/\D/g, ""))}
              data-testid="input-filter-id"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-filter-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              data-testid="button-clear-filters"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground py-2" data-testid="text-bookings-count">
          Showing {filteredBookings.length} of {bookings.length} bookings
        </div>

        <ScrollArea className="flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Event Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No bookings found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((booking) => (
                  <TableRow key={booking.id} data-testid={`row-booking-${booking.id}`}>
                    <TableCell className="font-mono text-sm">#{booking.id}</TableCell>
                    <TableCell className="font-medium">{booking.customerName}</TableCell>
                    <TableCell className="text-sm">{booking.email}</TableCell>
                    <TableCell className="text-sm">{booking.phone}</TableCell>
                    <TableCell className="text-sm">{booking.packageType}</TableCell>
                    <TableCell className="text-sm">{booking.eventDate}</TableCell>
                    <TableCell className="text-sm">{booking.eventTime}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[booking.status] || "secondary"}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {booking.paymentMethod || "stripe"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
