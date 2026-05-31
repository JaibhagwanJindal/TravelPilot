import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Map, Plane, Compass, Calendar, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <Link className="flex items-center justify-center" href="/">
          <Plane className="h-6 w-6 text-primary" />
          <span className="ml-2 font-bold text-xl">TravelPilot</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="#features">
            Features
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="#testimonials">
            Testimonials
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/dashboard">
            Dashboard
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-background to-muted">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Your AI Travel Companion
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Discover, plan, and experience your perfect trip with TravelPilot. AI-powered itineraries tailored just for you.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/dashboard">
                  <Button className="h-11 px-8">
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button variant="outline" className="h-11 px-8">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Intelligent Planning</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Everything you need to plan your next adventure, powered by advanced AI.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4 items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Map className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Smart Itineraries</h3>
                <p className="text-muted-foreground">
                  Get perfectly paced daily plans based on your preferences, travel style, and budget.
                </p>
              </div>
              <div className="flex flex-col justify-center space-y-4 items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Real-time Adjustments</h3>
                <p className="text-muted-foreground">
                  Plans changed? Weather turned bad? Instantly replan your day with a single click.
                </p>
              </div>
              <div className="flex flex-col justify-center space-y-4 items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Compass className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Local Insights</h3>
                <p className="text-muted-foreground">
                  Discover hidden gems and local favorites that aren't on typical tourist maps.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Ready to explore the world?
                </h2>
                <p className="max-w-[600px] text-primary-foreground/80 md:text-xl">
                  Join TravelPilot today and start planning your next unforgettable journey.
                </p>
              </div>
              <Link href="/dashboard">
                <Button variant="secondary" size="lg" className="h-12 px-8">
                  Start Planning Now
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} TravelPilot Inc. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
