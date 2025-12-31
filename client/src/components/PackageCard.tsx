import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock } from "lucide-react";

interface PackageCardProps {
  title: string;
  price: string;
  duration: string;
  features: string[];
  description: string;
  popular?: boolean;
  image?: string;
  onBook: () => void;
}

export default function PackageCard({
  title,
  price,
  duration,
  features,
  description,
  popular,
  image,
  onBook,
}: PackageCardProps) {
  return (
    <Card
      className="hover-elevate relative h-full flex flex-col"
      data-testid={`card-package-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {popular && (
        <div className="absolute top-0 left-0 right-0 flex justify-center -translate-y-1/2 z-10">
          <Badge className="bg-primary text-primary-foreground px-4 py-1.5 text-sm font-semibold shadow-lg">
            Most Popular
          </Badge>
        </div>
      )}
      {image && (
        <div className="relative h-48 overflow-hidden rounded-t-xl">
          <img src={image} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold font-['Poppins']">{title}</h3>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{duration}</span>
          </div>
          <div className="text-4xl font-bold text-primary">{price}</div>
        </div>
        <p className="text-sm text-muted-foreground text-center mt-4">
          {description}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full min-h-11"
          size="lg"
          onClick={onBook}
          data-testid={`button-book-${title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          Book Now
        </Button>
      </CardFooter>
    </Card>
  );
}
