import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sun, PartyPopper, Users, Calendar, Sparkles } from "lucide-react";
import outdoorImage from "@assets/stock_images/tropical_summer_pool_02de404f.jpg";
import celebrationImage from "@assets/stock_images/birthday_celebration_7766e39e.jpg";
import familyImage from "@assets/stock_images/happy_family_kids_pl_605bcf99.jpg";
import seasonalImage from "@assets/stock_images/halloween_party_cost_8a202d85.jpg";
import uniqueImage from "@assets/stock_images/unique_creative_part_55427373.jpg";

export default function PartyThemes() {
  const themes = {
    outdoor: {
      icon: Sun,
      title: "Outdoor & Summer",
      description: "Perfect for backyards, pools, or open fields",
      image: outdoorImage,
      ideas: [
        {
          name: "Tropical Foam Luau",
          description: "Hawaiian music, leis, palm decor, tiki drinks, and colored foam (try blue or green foam lighting!)"
        },
        {
          name: "Beach Bash",
          description: "Sand, beach balls, and surf tunes — bring the ocean to your yard!"
        },
        {
          name: "Slip 'n' Slide Foam Party",
          description: "Combine foam with inflatable slides for extra fun"
        },
        {
          name: "Neon Glow Foam Night",
          description: "Use UV-reactive foam and blacklights for a glowing dance floor after dark"
        },
        {
          name: "Bubble Olympics",
          description: "Foam-covered obstacle course or relay races for kids or adults"
        }
      ]
    },
    celebration: {
      icon: PartyPopper,
      title: "Party & Celebration",
      description: "For birthdays, graduations, or just-for-fun gatherings",
      image: celebrationImage,
      ideas: [
        {
          name: "Foam Fiesta",
          description: "Mexican-inspired — bright decorations, tacos, upbeat Latin music, and foam \"rain\""
        },
        {
          name: "Foam & Beats Dance Night",
          description: "DJ or playlist, strobe lights, and a dance floor covered in foam"
        },
        {
          name: "Birthday Foam Fest",
          description: "Customize with your name or age in foam letters or light-up signs"
        },
        {
          name: "End-of-School Bash",
          description: "Great for teens or college students — celebrate summer vacation in foam!"
        }
      ]
    },
    family: {
      icon: Users,
      title: "Family & Kids-Friendly",
      description: "Keep it clean, colorful, and safe for little ones",
      image: familyImage,
      ideas: [
        {
          name: "Foam Play Zone",
          description: "Just pure foam fun — toss in rubber ducks, pool noodles, or bubble machines"
        },
        {
          name: "Color Foam Party",
          description: "Use non-toxic colored foam for rainbow playtime"
        },
        {
          name: "Treasure Hunt in the Foam",
          description: "Hide small waterproof toys or tokens for kids to find"
        },
        {
          name: "Superhero Foam Party",
          description: "Everyone dresses up as their favorite hero — foam becomes the \"battle zone\""
        },
        {
          name: "Under the Sea Adventure",
          description: "Blue foam, sea creature decor, and water games"
        }
      ]
    },
    seasonal: {
      icon: Calendar,
      title: "Themed & Seasonal",
      description: "Switch it up for holidays or special events",
      image: seasonalImage,
      ideas: [
        {
          name: "Halloween \"Spooky Foam\" Party",
          description: "Orange or purple foam, fog machines, eerie lights, and costumes"
        },
        {
          name: "Winter \"Snow Foam\" Wonderland",
          description: "White foam + fake snow for a holiday vibe, even in summer"
        },
        {
          name: "St. Patrick's Foam Fest",
          description: "Green foam, Irish music, and shamrock decorations"
        },
        {
          name: "Fourth of July Foam Blast",
          description: "Red, white, and blue foam layers with patriotic games"
        },
        {
          name: "Valentine's Foam Bash",
          description: "Pink foam, love songs, and heart-shaped decor"
        }
      ]
    },
    unique: {
      icon: Sparkles,
      title: "Unique & Wildcard",
      description: "For when you want something truly different",
      image: uniqueImage,
      ideas: [
        {
          name: "Silent Foam Disco",
          description: "Everyone wears wireless headphones dancing in foam — quiet outside, chaos inside"
        },
        {
          name: "Foam Paint Party",
          description: "Combine foam with washable paint or color powder for artsy fun (use caution!)"
        },
        {
          name: "Pet Foam Pawty",
          description: "Dog-friendly foam party — safe, shallow foam pit for pups to play"
        },
        {
          name: "Charity Foam Run",
          description: "A 5K or fun run where participants go through foam zones"
        },
        {
          name: "Glow-in-the-Dark Foam Yoga",
          description: "Chill event — foam lights, calming music, gentle yoga moves"
        }
      ]
    }
  };

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold font-['Poppins'] mb-4">
            Party Themes & Ideas
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get inspired! Choose from dozens of creative themes to make your foam party truly unforgettable
          </p>
        </div>

        <Tabs defaultValue="outdoor" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-8">
            {Object.entries(themes).map(([key, theme]) => {
              const Icon = theme.icon;
              return (
                <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{theme.title}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.entries(themes).map(([key, theme]) => (
            <TabsContent key={key} value={key}>
              <Card>
                <div className="relative h-64 overflow-hidden rounded-t-lg">
                  <img 
                    src={theme.image} 
                    alt={theme.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h3 className="text-3xl font-bold font-['Poppins'] mb-2">{theme.title}</h3>
                    <p className="text-white/90 text-lg">{theme.description}</p>
                  </div>
                </div>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {theme.ideas.map((idea) => (
                      <Card key={idea.name} className="hover-elevate">
                        <CardHeader>
                          <CardTitle className="text-lg">{idea.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">{idea.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
