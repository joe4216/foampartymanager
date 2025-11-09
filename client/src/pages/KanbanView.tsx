import KanbanBoard from "@/components/KanbanBoard";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Booking } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function KanbanView() {
  const { toast } = useToast();
  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/bookings/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Status Updated",
        description: "Booking status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update booking status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (bookingId: number, newStatus: string) => {
    updateStatusMutation.mutate({ id: bookingId, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-muted-foreground">Loading kanban board...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-['Poppins'] mb-2">Kanban Board</h1>
        <p className="text-muted-foreground">Manage your bookings by workflow stage</p>
      </div>

      <KanbanBoard bookings={bookings} onStatusChange={handleStatusChange} />
    </div>
  );
}
