import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Calendar, MapPin, Users, ThumbsUp, Share2, Loader2, PartyPopper } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { NewsFeedEvent } from "@shared/schema";
import partyImage1 from "@assets/stock_images/foam_party_concert_c_e76f1010.jpg";
import partyImage2 from "@assets/stock_images/foam_party_concert_c_49509d2b.jpg";
import partyImage3 from "@assets/stock_images/foam_party_concert_c_96f5780e.jpg";

const defaultThumbnails = [partyImage1, partyImage2, partyImage3];

export default function NewsFeed() {
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
  const [hoveredVideo, setHoveredVideo] = useState<number | null>(null);
  
  const { data: events = [], isLoading } = useQuery<NewsFeedEvent[]>({
    queryKey: ["/api/news-feed"],
  });

  const getThumbnail = (event: NewsFeedEvent, index: number) => {
    if (event.thumbnailUrl) return event.thumbnailUrl;
    return defaultThumbnails[index % defaultThumbnails.length];
  };

  if (isLoading) {
    return (
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold font-['Poppins'] mb-4">
              News Feed & Recent Events
            </h2>
            <div className="py-12">
              <PartyPopper className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
                Stay tuned! We'll be sharing highlights from our foam parties here soon.
              </p>
              <Button 
                size="lg" 
                data-testid="button-book-your-party"
                onClick={() => {
                  const packagesSection = document.getElementById('packages-section');
                  packagesSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Book Your Party Today
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold font-['Poppins'] mb-4">
            News Feed & Recent Events
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Check out the latest foam parties we've created! Watch highlights from recent events and see the joy we bring to every celebration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event, index) => (
            <Card key={event.id} className="hover-elevate overflow-hidden" data-testid={`card-party-${event.id}`}>
              <div 
                className="relative group"
                onMouseEnter={() => setHoveredVideo(event.id)}
                onMouseLeave={() => setHoveredVideo(null)}
              >
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={getThumbnail(event, index)}
                    alt={event.title}
                    className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${hoveredVideo === event.id ? 'opacity-0' : 'opacity-100'}`}
                  />
                  <iframe
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${hoveredVideo === event.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    src={hoveredVideo === event.id ? `${event.videoUrl}?autoplay=1&mute=1&controls=0&loop=1&playlist=${event.videoUrl.split('/').pop()}` : 'about:blank'}
                    title={event.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    data-testid={`iframe-hover-preview-${event.id}`}
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors pointer-events-none" />
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <Button 
                      size="icon" 
                      className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30 pointer-events-auto"
                      onClick={() => setSelectedVideo(event.id)}
                      data-testid={`button-play-video-${event.id}`}
                    >
                      <Play className="w-8 h-8 ml-1" fill="currentColor" />
                    </Button>
                  </div>
                  <div className="absolute top-4 right-4 z-10 pointer-events-none">
                    <Badge className="bg-primary/90 backdrop-blur-sm" data-testid={`badge-category-${event.id}`}>
                      {event.category}
                    </Badge>
                  </div>
                </div>
              </div>

              <CardHeader>
                <CardTitle className="text-xl font-['Poppins']" data-testid={`text-party-title-${event.id}`}>
                  {event.title}
                </CardTitle>
                <CardDescription className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span data-testid={`text-party-date-${event.id}`}>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span data-testid={`text-party-location-${event.id}`}>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    <span data-testid={`text-party-attendees-${event.id}`}>{event.attendees} guests</span>
                  </div>
                </CardDescription>
              </CardHeader>

              <CardContent>
                <p className="text-muted-foreground mb-4" data-testid={`text-party-description-${event.id}`}>
                  {event.description}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors" data-testid={`button-like-${event.id}`}>
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors" data-testid={`button-share-${event.id}`}>
                      <Share2 className="w-4 h-4" />
                      <span className="text-sm">Share</span>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Want to see your event featured here?
          </p>
          <Button 
            size="lg" 
            data-testid="button-book-your-party"
            onClick={() => {
              const packagesSection = document.getElementById('packages-section');
              packagesSection?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Book Your Party Today
          </Button>
        </div>
      </div>

      <Dialog open={selectedVideo !== null} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl p-0" data-testid="dialog-video-player">
          <DialogTitle className="sr-only">
            {selectedVideo && events.find(e => e.id === selectedVideo)?.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Watch highlights from this foam party event
          </DialogDescription>
          <div className="relative pt-[56.25%]">
            {selectedVideo && (
              <iframe
                className="absolute inset-0 w-full h-full"
                src={events.find(e => e.id === selectedVideo)?.videoUrl}
                title="Party Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                data-testid="iframe-video"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
