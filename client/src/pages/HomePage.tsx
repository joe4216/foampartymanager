import { useState } from "react";
import Hero from "@/components/Hero";
import StatsBar from "@/components/StatsBar";
import FeaturedPackages from "@/components/FeaturedPackages";
import HowItWorks from "@/components/HowItWorks";
import NewsFeed from "@/components/NewsFeed";
import Gallery from "@/components/Gallery";
import Testimonials from "@/components/Testimonials";
import BookingModal from "@/components/BookingModal";
import ChatBot from "@/components/ChatBot";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, MapPin, ShieldCheck, Droplet, Wind, Sparkles, Leaf, Heart } from "lucide-react";
import { SiFacebook } from "react-icons/si";
import { Link } from "wouter";
import largeFoamEventImage from "@assets/generated_images/exciting_large_foam_party_celebration.png";

export default function HomePage() {
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>();

  const handleBookClick = (packageType: string) => {
    setSelectedPackage(packageType);
    setBookingModalOpen(true);
  };

  const slugify = (text: string): string => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };

  const safetyFeatures = [
    {
      icon: ShieldCheck,
      title: "100% Safe",
      description: "FDA-approved formula safe for all ages"
    },
    {
      icon: Droplet,
      title: "No Stains",
      description: "Rinses away completely, leaves no residue"
    },
    {
      icon: Wind,
      title: "Scent-Free",
      description: "Unscented formula for sensitive noses"
    },
    {
      icon: Sparkles,
      title: "Non-Toxic",
      description: "Safe, gentle formula for everyone"
    },
    {
      icon: Leaf,
      title: "Biodegradable",
      description: "Eco-friendly and environmentally safe"
    },
    {
      icon: Heart,
      title: "Hypoallergenic",
      description: "Perfect for sensitive skin"
    }
  ];

  return (
    <div className="min-h-screen">
      <Hero />
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-['Poppins'] mb-4">
              Safe & Family-Friendly Fun
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our premium foam solution is specially designed for worry-free celebrations
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
            {safetyFeatures.map((feature) => {
              const Icon = feature.icon;
              const slug = slugify(feature.title);
              return (
                <Card key={feature.title} className="hover-elevate" data-testid={`card-safety-${slug}`}>
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold font-['Poppins'] mb-2" data-testid={`text-${slug}-title`}>
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground" data-testid={`text-${slug}-description`}>
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      <NewsFeed />
      <StatsBar />
      <FeaturedPackages onBookClick={handleBookClick} />
      <HowItWorks />
      <Gallery />
      <Testimonials />
      <div id="booking-section" className="py-16 md:py-24 bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold font-['Poppins'] mb-6">
                Ready to Foam?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Let's make your next event absolutely unforgettable! Book your foam party today and get ready for the most fun you've ever had.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">Call Us</div>
                    <a href="tel:555-FOAM-FUN" className="text-muted-foreground hover:text-primary">(256) 505-2129</a>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">Email Us</div>
                    <a href="mailto:party@foamworksparty.com" className="text-muted-foreground hover:text-primary">Jacee021798@gmail.com</a>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">Service Area</div>
                    <div className="text-muted-foreground">North Alabama</div>
                  </div>
                </div>
              </div>
              
              <Button 
                size="lg" 
                className="text-lg px-8"
                onClick={() => handleBookClick("Classic Party Package")}
                data-testid="button-book-cta"
              >
                Book Your Party Now
              </Button>
            </div>
            
            <div className="relative h-96 rounded-xl overflow-hidden">
              <img
                src={largeFoamEventImage}
                alt="Large foam party event"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
      <footer className="bg-card border-t py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold font-['Poppins'] mb-4">Foam Works Party Co.</h3>
              <p className="text-muted-foreground">Foam Around and Find Out</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#packages-section" className="hover:text-primary">Packages</a></li>
                <li><a href="#booking-section" className="hover:text-primary">Book Now</a></li>
                <li><Link href="/owner/dashboard" className="hover:text-primary">Owner Portal</Link></li>
                <li>
                  <a 
                    href="https://www.facebook.com/share/1GyxtfPjR7/?mibextid=wwXIfr" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-primary"
                    data-testid="link-facebook"
                  >Facebook Page</a>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>(256) 505-2129</li>
                <li>Jacee021798@gmail.com</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>© 2024 Foam Works Party Co. All rights reserved.</p>
          </div>
        </div>
      </footer>
      <BookingModal
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
        selectedPackage={selectedPackage}
      />
      <ChatBot />
    </div>
  );
}
