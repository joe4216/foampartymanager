import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Newspaper, Plus, Pencil, Trash2, Loader2, Video, Calendar, MapPin, Users, PartyPopper, Upload, X, CalendarIcon } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { NewsFeedEvent } from "@shared/schema";

const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  videoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  thumbnailUrl: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  location: z.string().min(1, "Location is required"),
  attendees: z.string().min(1, "Number of guests is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Type of party is required"),
});

type EventFormData = z.infer<typeof eventFormSchema>;

const PARTY_CATEGORIES = [
  { value: "Birthday", label: "Birthday Party" },
  { value: "Concert", label: "Concert/Festival" },
  { value: "Corporate", label: "Corporate Event" },
  { value: "School", label: "School Event" },
  { value: "Gender Reveal", label: "Gender Reveal" },
  { value: "Wedding", label: "Wedding" },
  { value: "Community", label: "Community Event" },
  { value: "Other", label: "Other" },
];

export default function NewsFeedPage() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<NewsFeedEvent | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: events = [], isLoading } = useQuery<NewsFeedEvent[]>({
    queryKey: ["/api/news-feed"],
  });

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      videoUrl: "",
      thumbnailUrl: "",
      date: "",
      location: "",
      attendees: "",
      description: "",
      category: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const res = await apiRequest("POST", "/api/news-feed", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news-feed"] });
      toast({ title: "Event Created", description: "Your event has been added to the news feed." });
      setShowForm(false);
      form.reset();
      setCustomCategory("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create event.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EventFormData }) => {
      const res = await apiRequest("PATCH", `/api/news-feed/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news-feed"] });
      toast({ title: "Event Updated", description: "Your event has been updated." });
      setEditingEvent(null);
      form.reset();
      setCustomCategory("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update event.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/news-feed/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news-feed"] });
      toast({ title: "Event Deleted", description: "The event has been removed from the news feed." });
      setDeleteConfirmId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete event.", variant: "destructive" });
    },
  });

  const handleThumbnailUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("thumbnail", file);
      
      const response = await fetch("/api/news-feed/upload-thumbnail", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      const result = await response.json();
      if (result.success && result.thumbnailUrl) {
        form.setValue("thumbnailUrl", result.thumbnailUrl);
        setThumbnailPreview(result.thumbnailUrl);
        toast({ title: "Image Uploaded", description: "Thumbnail uploaded successfully." });
      } else {
        toast({ title: "Upload Failed", description: result.error || "Failed to upload image.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Upload Failed", description: "Failed to upload image.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid File", description: "Please select an image file.", variant: "destructive" });
        return;
      }
      handleThumbnailUpload(file);
    }
  };

  const clearThumbnail = () => {
    form.setValue("thumbnailUrl", "");
    setThumbnailPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddNew = () => {
    form.reset({
      title: "",
      videoUrl: "",
      thumbnailUrl: "",
      date: "",
      location: "",
      attendees: "",
      description: "",
      category: "",
    });
    setThumbnailPreview(null);
    setCustomCategory("");
    setShowForm(true);
  };

  const handleEdit = (event: NewsFeedEvent) => {
    setEditingEvent(event);
    const isCustomCategory = !PARTY_CATEGORIES.some(c => c.value === event.category);
    form.reset({
      title: event.title,
      videoUrl: event.videoUrl,
      thumbnailUrl: event.thumbnailUrl || "",
      date: event.date,
      location: event.location,
      attendees: event.attendees,
      description: event.description,
      category: event.category,
    });
    setCustomCategory(isCustomCategory ? event.category : "");
    setThumbnailPreview(event.thumbnailUrl || null);
  };

  const onSubmit = (data: EventFormData) => {
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isAtLimit = events.length >= 3;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-['Poppins'] mb-2 flex items-center gap-2">
            <Newspaper className="w-7 h-7" />
            News Feed Management
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Add and manage events shown on your homepage
            <span className="ml-2">
              <Badge variant={isAtLimit ? "destructive" : "secondary"} data-testid="badge-event-count">
                {events.length}/3 events
              </Badge>
            </span>
          </p>
        </div>
        <Button 
          onClick={handleAddNew} 
          disabled={isAtLimit}
          data-testid="button-add-event"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </Button>
      </div>

      {isAtLimit && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              You've reached the maximum of 3 events. To add a new event, please delete an existing one first.
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <PartyPopper className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
            <p className="text-muted-foreground mb-4">Add your first event to showcase on the homepage news feed.</p>
            <Button onClick={handleAddNew} data-testid="button-add-first-event">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {events.map((event) => (
            <Card key={event.id} data-testid={`card-event-${event.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg truncate">{event.title}</CardTitle>
                    <CardDescription className="mt-1">
                      <Badge variant="secondary" className="text-xs">{event.category}</Badge>
                    </CardDescription>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(event)}
                      data-testid={`button-edit-event-${event.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmId(event.id)}
                      data-testid={`button-delete-event-${event.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4 shrink-0" />
                    <span>{event.attendees} guests</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Video className="w-4 h-4 shrink-0" />
                    <a href={event.videoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                      Video Link
                    </a>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{event.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm || editingEvent !== null} onOpenChange={(open) => {
        if (!open) {
          setShowForm(false);
          setEditingEvent(null);
          setThumbnailPreview(null);
          setCustomCategory("");
          form.reset();
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Add New Event"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Epic Summer Concert Foam Party" {...field} data-testid="input-event-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video URL <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.youtube.com/embed/..." {...field} data-testid="input-event-video" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Cover Image</FormLabel>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                  data-testid="input-event-thumbnail"
                />
                {thumbnailPreview ? (
                  <div className="relative">
                    <img 
                      src={thumbnailPreview} 
                      alt="Thumbnail preview" 
                      className="w-full h-40 object-cover rounded-md border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={clearThumbnail}
                      data-testid="button-remove-thumbnail"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-40 flex flex-col gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    data-testid="button-upload-thumbnail"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8" />
                        <span>Click to upload cover image</span>
                        <span className="text-xs text-muted-foreground">This image is displayed on the news feed</span>
                      </>
                    )}
                  </Button>
                )}
              </div>

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="input-event-date"
                          >
                            {field.value || "Pick a date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarPicker
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(format(date, "MMMM d, yyyy"));
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Downtown Festival Grounds" {...field} data-testid="input-event-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="attendees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Guests</FormLabel>
                    <FormControl>
                      <Input placeholder="500+" {...field} data-testid="input-event-attendees" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type of Party</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== "Other") {
                          setCustomCategory("");
                        }
                      }} 
                      value={PARTY_CATEGORIES.some(c => c.value === field.value) ? field.value : (field.value ? "Other" : "")}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-event-category">
                          <SelectValue placeholder="Select party type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PARTY_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(field.value === "Other" || (field.value && !PARTY_CATEGORIES.some(c => c.value === field.value))) && (
                      <Input
                        placeholder="Enter custom party type"
                        value={customCategory || (PARTY_CATEGORIES.some(c => c.value === field.value) ? "" : field.value)}
                        onChange={(e) => {
                          setCustomCategory(e.target.value);
                          field.onChange(e.target.value || "Other");
                        }}
                        className="mt-2"
                        data-testid="input-custom-category"
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What an incredible night! Over 500 guests danced the night away..."
                        className="min-h-[100px]"
                        {...field}
                        data-testid="input-event-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingEvent(null);
                    setCustomCategory("");
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} data-testid="button-submit-event">
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingEvent ? "Save Changes" : "Add Event"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this event? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
