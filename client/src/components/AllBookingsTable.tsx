import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table2, Search, X, CalendarIcon } from "lucide-react";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
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
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesName = booking.customerName.toLowerCase().includes(searchName.toLowerCase());
      const matchesEmail = booking.email.toLowerCase().includes(searchEmail.toLowerCase());
      const matchesPhone = booking.phone.includes(searchPhone);
      const matchesId = searchId === "" || booking.id.toString() === searchId;
      const matchesStatus = statusFilter === "all" || booking.status === statusFilter;

      let matchesDateRange = true;
      if (startDate || endDate) {
        const eventDate = parseISO(booking.eventDate);
        if (startDate && endDate) {
          matchesDateRange = isWithinInterval(eventDate, {
            start: startOfDay(startDate),
            end: endOfDay(endDate)
          });
        } else if (startDate) {
          matchesDateRange = eventDate >= startOfDay(startDate);
        } else if (endDate) {
          matchesDateRange = eventDate <= endOfDay(endDate);
        }
      }

      return matchesName && matchesEmail && matchesPhone && matchesId && matchesStatus && matchesDateRange;
    });
  }, [bookings, searchName, searchEmail, searchPhone, searchId, statusFilter, startDate, endDate]);

  const clearFilters = () => {
    setSearchName("");
    setSearchEmail("");
    setSearchPhone("");
    setSearchId("");
    setStatusFilter("all");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const hasFilters = searchName || searchEmail || searchPhone || searchId || statusFilter !== "all" || startDate || endDate;

  const getDateRangeLabel = () => {
    if (startDate && endDate) {
      return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d")}`;
    } else if (startDate) {
      return `From ${format(startDate, "MMM d")}`;
    } else if (endDate) {
      return `Until ${format(endDate, "MMM d")}`;
    }
    return "Date Range";
  };

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
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="pl-9"
              data-testid="input-filter-name"
            />
          </div>
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="pl-9"
              data-testid="input-filter-email"
            />
          </div>
          <div className="relative flex-1 min-w-[130px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search phone..."
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="pl-9"
              data-testid="input-filter-phone"
            />
          </div>
          <div className="w-[100px]">
            <Input
              placeholder="Booking #"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value.replace(/\D/g, ""))}
              data-testid="input-filter-id"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]" data-testid="select-filter-status">
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
          
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={`w-[180px] justify-start text-left font-normal ${(startDate || endDate) ? "" : "text-muted-foreground"}`}
                data-testid="button-date-range"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {getDateRangeLabel()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Start Date</div>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </div>
                <div className="border-t pt-4 space-y-2">
                  <div className="text-sm font-medium">End Date</div>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                  />
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setStartDate(undefined);
                      setEndDate(undefined);
                    }}
                    data-testid="button-clear-dates"
                  >
                    Clear Dates
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {hasFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              data-testid="button-clear-filters"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground py-2" data-testid="text-bookings-count">
          Showing {filteredBookings.length} of {bookings.length} bookings
          {(startDate || endDate) && (
            <span className="ml-2">
              ({startDate ? format(startDate, "MMM d, yyyy") : "..."} - {endDate ? format(endDate, "MMM d, yyyy") : "..."})
            </span>
          )}
        </div>

        <ScrollArea className="flex-1" type="always">
          <div className="min-w-[1000px]">
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
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
