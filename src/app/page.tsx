import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, CheckCircle, UploadCloud, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-secondary">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-4">
                  <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    The Battlefield for Modern Shipping
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Shipping Battlefield connects exporters with a network of trusted
                    carriers, creating a competitive marketplace for all your
                    shipping needs.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg" className="group">
                    <Link href="/signup">
                      Exporter Signup
                      <ArrowRight className="inline-block w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary">
                    <Link href="/login">Carrier Portal</Link>
                  </Button>
                </div>
              </div>
              <Image
                src="https://placehold.co/600x400.png"
                width="600"
                height="400"
                alt="Container ship"
                data-ai-hint="shipping logistics"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
              />
            </div>
          </div>
        </section>

        <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
                  How It Works
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                  A Seamless Shipping Experience
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Three simple steps to get your cargo on the move. Our
                  platform streamlines the process from start to finish.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none mt-12">
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                <CardHeader className="flex flex-col items-center text-center p-8">
                  <div className="p-4 rounded-full bg-primary/20 text-primary mb-4">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <CardTitle className="font-headline mb-2">
                    1. Post Your Shipment
                  </CardTitle>
                  <CardDescription>
                    Provide details about your cargo, destination, and desired
                    timeframe. Our intuitive form makes it easy.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                <CardHeader className="flex flex-col items-center text-center p-8">
                  <div className="p-4 rounded-full bg-primary/20 text-primary mb-4">
                    <Users className="w-8 h-8" />
                  </div>
                  <CardTitle className="font-headline mb-2">
                    2. Receive Bids
                  </CardTitle>
                  <CardDescription>
                    Carriers in our network will bid on your shipment, ensuring
                    you get competitive rates from qualified professionals.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                <CardHeader className="flex flex-col items-center text-center p-8">
                  <div className="p-4 rounded-full bg-primary/20 text-primary mb-4">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <CardTitle className="font-headline mb-2">
                    3. Choose Your Carrier
                  </CardTitle>
                  <CardDescription>
                    Review carrier profiles, ratings, and bids to select the
                    best partner for your shipment. Book with confidence.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
