import PackageCard from "./PackageCard";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import quickFoamImage from "@assets/Image (1)_1763957918375.jpg";
import standardGlowImage from "@assets/Image_1763956231086.jpg";
import extendedGlowImage from "@assets/images_1763957656153.jpg";

interface FeaturedPackagesProps {
  onBookClick: (packageType: string) => void;
}

export default function FeaturedPackages({ onBookClick }: FeaturedPackagesProps) {
  const standardPackages = [
    {
      title: "Quick Foam Fun",
      price: "$200",
      duration: "30 minutes",
      features: [
        "Perfect for small gatherings",
        "Compact foam machine",
        "Foam solution included",
        "Quick setup and breakdown"
      ],
      description: "A burst of foam excitement perfect for short events and intimate celebrations"
    },
    {
      title: "Classic Party Package",
      price: "$325",
      duration: "1 hour",
      features: [
        "Most popular choice",
        "Professional foam machine",
        "Extended foam time",
        "Setup and breakdown included",
        "Foam solution provided"
      ],
      description: "The perfect balance of fun and value - ideal for birthdays and celebrations",
      popular: true
    },
    {
      title: "Extended Foam Experience",
      price: "$430",
      duration: "2 hours",
      features: [
        "Maximum foam time",
        "Professional foam machine",
        "Unlimited foam refills",
        "Full event support",
        "Foam solution included"
      ],
      description: "The ultimate foam party experience for those who want the fun to last"
    }
  ];

  const glowFoamPackages = [
    {
      title: "Standard Glow Foam",
      price: "+$125",
      duration: "Add-on",
      features: [
        "UV-reactive foam solution",
        "Glows under blacklights",
        "Creates neon spectacle",
        "Perfect for night parties",
        "Unforgettable photos"
      ],
      description: "Transform any foam party into a magical glowing experience"
    },
    {
      title: "Extended Glow Foam",
      price: "+$200",
      duration: "Add-on",
      features: [
        "UV-reactive foam solution",
        "Extended glow time",
        "Multiple color options",
        "Enhanced lighting effects",
        "Premium photo opportunities",
        "Perfect for larger events"
      ],
      description: "Maximum glow impact for extended parties and bigger celebrations"
    }
  ];

  const genderRevealPackages = [
    {
      title: "Surprise in Style",
      price: "$300",
      duration: "30 minutes",
      features: [
        "Pink or blue foam reveal",
        "Professional foam machine",
        "Dramatic reveal moment",
        "Perfect for photo ops",
        "Foam solution included"
      ],
      description: "Make your gender reveal unforgettable with a colorful foam surprise"
    },
    {
      title: "Extended Reveal Celebration",
      price: "$475",
      duration: "1 hour",
      features: [
        "Pink or blue foam reveal",
        "Extended party time",
        "Professional foam machine",
        "Multiple foam sessions",
        "Perfect for larger gatherings",
        "Foam solution provided"
      ],
      description: "Extend the celebration with a full hour of gender reveal foam fun"
    }
  ];

  return (
    <div id="packages-section" className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold font-['Poppins'] mb-4">
            Choose Your Package
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Time-based pricing for every celebration - from quick fun to extended foam experiences
          </p>
        </div>

        <div className="mb-16">
          <h3 className="text-3xl font-bold font-['Poppins'] text-center mb-8">Standard Foam Parties</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {standardPackages.map((pkg, index) => (
              <PackageCard
                key={pkg.title}
                {...pkg}
                image={index === 0 ? quickFoamImage : undefined}
                onBook={() => onBookClick(pkg.title)}
              />
            ))}
          </div>
        </div>

        <div className="mb-16">
          <h3 className="text-3xl font-bold font-['Poppins'] text-center mb-8">Glow Foam Add-On</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {glowFoamPackages.map((pkg, index) => (
              <PackageCard
                key={pkg.title}
                {...pkg}
                image={index === 0 ? standardGlowImage : extendedGlowImage}
                onBook={() => onBookClick(pkg.title)}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-3xl font-bold font-['Poppins'] text-center mb-8">Gender Reveal Parties</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {genderRevealPackages.map((pkg) => (
              <PackageCard
                key={pkg.title}
                {...pkg}
                onBook={() => onBookClick(pkg.title)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
