import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1">
      <section className="w-full py-24 md:py-32 lg:py-40 bg-secondary">
        <div className="container">
          <div className="flex flex-col items-center space-y-8 text-center">
            <div className="space-y-4">
                <h1 className="pb-4 text-5xl font-bold tracking-tighter text-primary sm:text-6xl md:text-7xl lg:text-8xl font-headline bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-400">
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
            <Link href="#" className="text-sm underline underline-offset-4 hover:text-primary">
                How Shipping Battlefield Works
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
