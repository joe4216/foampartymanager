import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Calendar, MapPin, Users, ThumbsUp, Share2, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import partyImage1 from "@assets/stock_images/foam_party_concert_c_e76f1010.jpg";
import partyImage2 from "@assets/stock_images/foam_party_concert_c_49509d2b.jpg";
import partyImage3 from "@assets/stock_images/foam_party_concert_c_96f5780e.jpg";

export default function NewsFeed() {
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
  const [hoveredVideo, setHoveredVideo] = useState<number | null>(null);
  
  const recentParties = [
    {
      id: 1,
      title: "Epic Summer Concert Foam Party 2024",
      date: "November 15, 2024",
      location: "Downtown Festival Grounds",
      attendees: "500+",
      description: "What an incredible night! Over 500 guests danced the night away in our massive foam pit. The energy was electric with DJ Mike spinning non-stop hits!",
      thumbnail: partyImage1,
      videoUrl: "https://www.youtube.com/embed/DDtjbk1X0r8",
      likes: 247,
      category: "Concert"
    },
    {
      id: 2,
      title: "Birthday Bash Foam Extravaganza",
      date: "November 8, 2024",
      location: "Private Residence, Oakwood",
      attendees: "75",
      description: "Sarah's 21st birthday was one for the books! Tropical theme with colored foam, tiki torches, and endless smiles. Thanks for letting us be part of your special day!",
      thumbnail: partyImage2,
      videoUrl: "https://www.youtube.com/embed/DDtjbk1X0r8",
      likes: 156,
      category: "Birthday"
    },
    {
      id: 3,
      title: "Corporate Team Building Foam Fun",
      date: "October 28, 2024",
      location: "Tech Park Pavilion",
      attendees: "120",
      description: "When TechCorp wanted to boost team morale, they chose foam! Watch as executives and employees alike let loose in the ultimate team bonding experience.",
      thumbnail: partyImage3,
      videoUrl: "https://www.youtube.com/embed/DDtjbk1X0r8",
      likes: 98,
      category: "Corporate"
    }
  ];

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
          {recentParties.map((party) => (
            <Card key={party.id} className="hover-elevate overflow-hidden" data-testid={`card-party-${party.id}`}>
              <div 
                className="relative group"
                onMouseEnter={() => setHoveredVideo(party.id)}
                onMouseLeave={() => setHoveredVideo(null)}
              >
                <div className="relative h-64 overflow-hidden">
                  {hoveredVideo === party.id ? (
                    <iframe
                      className="w-full h-full object-cover"
                      src={`${party.videoUrl}?autoplay=1&mute=1&controls=0&loop=1&playlist=${party.videoUrl.split('/').pop()}`}
                      title={party.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      data-testid={`iframe-hover-preview-${party.id}`}
                    />
                  ) : (
                    <>
                      <img 
                        src={party.thumbnail}
                        alt={party.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Button 
                          size="icon" 
                          className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30"
                          onClick={() => setSelectedVideo(party.id)}
                          data-testid={`button-play-video-${party.id}`}
                        >
                          <Play className="w-8 h-8 ml-1" fill="currentColor" />
                        </Button>
                      </div>
                    </>
                  )}
                  <div className="absolute top-4 right-4 z-10">
                    <Badge className="bg-primary/90 backdrop-blur-sm" data-testid={`badge-category-${party.id}`}>
                      {party.category}
                    </Badge>
                  </div>
                </div>
              </div>

              <CardHeader>
                <CardTitle className="text-xl font-['Poppins']" data-testid={`text-party-title-${party.id}`}>
                  {party.title}
                </CardTitle>
                <CardDescription className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span data-testid={`text-party-date-${party.id}`}>{party.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span data-testid={`text-party-location-${party.id}`}>{party.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    <span data-testid={`text-party-attendees-${party.id}`}>{party.attendees} guests</span>
                  </div>
                </CardDescription>
              </CardHeader>

              <CardContent>
                <p className="text-muted-foreground mb-4" data-testid={`text-party-description-${party.id}`}>
                  {party.description}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors" data-testid={`button-like-${party.id}`}>
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-sm">{party.likes}</span>
                    </button>
                    <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors" data-testid={`button-share-${party.id}`}>
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
          <Button size="lg" data-testid="button-book-your-party">
            Book Your Party Today
          </Button>
        </div>
      </div>

      <Dialog open={selectedVideo !== null} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl p-0" data-testid="dialog-video-player">
          <DialogTitle className="sr-only">
            {selectedVideo && recentParties.find(p => p.id === selectedVideo)?.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Watch highlights from this foam party event
          </DialogDescription>
          <div className="relative pt-[56.25%]">
            {selectedVideo && (
              <iframe
                className="absolute inset-0 w-full h-full"
                src={recentParties.find(p => p.id === selectedVideo)?.videoUrl}
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
