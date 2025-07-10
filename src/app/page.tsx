import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Ship, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1">
      <section className="w-full py-20 md:py-28 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-8 text-center">
            <div className="space-y-4">
                <h1 className="pb-4 text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl font-headline bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-400">
                The Global Marketplace for Freight
                </h1>
                <p className="mx-auto max-w-[800px] text-muted-foreground md:text-xl">
                Shipping Battlefield is the premier online platform where exporters and freight carriers
                connect, compete, and collaborate. Get the best rates for your shipments through our
                dynamic, real-time bidding system.
                </p>
            </div>
            <div className="flex flex-col gap-4 min-[400px]:flex-row justify-center">
                <Button asChild size="lg" className="group bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg transition-transform hover:scale-105">
                    <Link href="/signup">
                        Exporter Sign Up
                        <ArrowRight className="inline-block w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="shadow-lg transition-transform hover:scale-105">
                    <Link href="/login">Carrier Portal</Link>
                </Button>
            </div>
            <Link href="/how-it-works" className="text-sm underline underline-offset-4 hover:text-primary">
                How Shipping Battlefield Works
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full py-20 md:py-28 lg:py-32 bg-secondary">
        <div className="container px-4 md:px-6">
          <div className="grid gap-12 md:grid-cols-3 md:gap-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-primary text-primary-foreground rounded-full p-4">
                <Zap className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold font-headline">Live Bidding</h3>
              <p className="text-muted-foreground max-w-xs">
                Post your shipment needs and watch as top-rated carriers bid for your business in real-time, ensuring you get competitive market rates.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-primary text-primary-foreground rounded-full p-4">
                <Ship className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold font-headline">Vetted Carriers</h3>
              <p className="text-muted-foreground max-w-xs">
                Access a global network of trusted and verified freight professionals, all competing to provide you with the best service.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-primary text-primary-foreground rounded-full p-4">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold font-headline">Transparent Process</h3>
              <p className="text-muted-foreground max-w-xs">
                Manage your shipments, track progress, and handle documentation all in one place with our streamlined and transparent dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
