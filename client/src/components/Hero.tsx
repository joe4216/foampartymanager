import { Button } from "@/components/ui/button";
import { Sparkles, User } from "lucide-react";
import { SiFacebook, SiInstagram } from "react-icons/si";
import { Link } from "wouter";
import heroImage from "@assets/generated_images/Hero_foam_party_scene_c579c411.png";

export default function Hero() {
  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section');
    bookingSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToPackages = () => {
    const packagesSection = document.getElementById('packages-section');
    packagesSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60" />
      <nav className="absolute top-0 left-0 right-0 z-20 px-4 md:px-6 lg:px-8 py-4">
        <div className="flex items-start justify-between">
          <div className="text-white font-bold text-xl font-['Poppins'] pt-2">Foam Works Party Co.</div>
          <div className="flex flex-col items-end gap-2">
            <Link href="/auth">
              <Button 
                variant="outline" 
                className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20"
                data-testid="button-owner-signin"
              >
                <User className="w-4 h-4 mr-2" />
                Owner Sign In
              </Button>
            </Link>
            <div className="flex items-center gap-3 pr-1">
              <a 
                href="https://www.facebook.com/share/1GyxtfPjR7/?mibextid=wwXIfr" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors"
                data-testid="link-facebook-hero"
              >
                <SiFacebook className="w-5 h-5" />
              </a>
              <a 
                href="https://www.instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors"
                data-testid="link-instagram-hero"
              >
                <SiInstagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </nav>
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-2 mb-6">
          <Sparkles className="w-5 h-5 text-white" />
          <span className="text-white font-medium">Professional Foam Party Rentals</span>
        </div>
        
        <h1 className="font-['Poppins'] text-5xl md:text-7xl lg:text-8xl font-extrabold text-white mb-6 leading-tight">
          Foam Works<br />Party Co.
        </h1>
        
        <p className="text-2xl md:text-4xl text-white font-bold mb-8 font-['Poppins']">Foam Around and Find Out</p>
        
        <p className="text-lg md:text-xl text-white/90 mb-12 max-w-2xl mx-auto">
          Transform any event into an unforgettable foam-filled celebration. Professional equipment, safe fun, and memories that last forever.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 h-auto"
            onClick={scrollToBooking}
            data-testid="button-book-hero"
          >
            Book Your Party
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="text-lg px-8 py-6 h-auto bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20"
            onClick={scrollToPackages}
            data-testid="button-view-packages-hero"
          >
            View Packages
          </Button>
        </div>
      </div>
    </div>
  );
}
