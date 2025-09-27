
"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Ship, CheckCircle, Anchor, Truck } from "lucide-react";
import Link from "next/link";
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);
  
  if (loading || user) {
      return (
          <div className="container py-10">
              <div className="flex justify-between items-center mb-8">
                  <Skeleton className="h-10 w-48" />
              </div>
              <Skeleton className="h-80 w-full rounded-lg" />
          </div>
      );
  }

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
                    <Link href="/login/exporter">
                        Exporter Portal
                        <ArrowRight className="inline-block w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="shadow-lg transition-transform hover:scale-105">
                    <Link href="/login/carrier">Carrier Portal</Link>
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

      <section className="w-full py-20 md:py-28">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
                  Who Do We Help?
              </h2>
              <p className="max-w-[600px] text-muted-foreground md:text-lg">
                  Our platform is designed to empower every link in the supply chain.
              </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="p-6">
              <CardHeader className="flex flex-row items-center gap-4 p-0 pb-6">
                <div className="bg-primary text-primary-foreground rounded-full p-3">
                  <Anchor className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl font-bold font-headline m-0">Exporters & Importers</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                  <p className="text-muted-foreground">
                    Whether you're sending goods across the globe or bringing them into the country, our platform provides the tools to find reliable shipping partners at competitive prices. Streamline your logistics, reduce costs, and gain full visibility over your supply chain.
                  </p>
              </CardContent>
            </Card>
             <Card className="p-6">
              <CardHeader className="flex flex-row items-center gap-4 p-0 pb-6">
                <div className="bg-primary text-primary-foreground rounded-full p-3">
                  <Truck className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl font-bold font-headline m-0">Logistic Service Providers</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                  <p className="text-muted-foreground">
                   Access a constant stream of shipment opportunities to keep your fleet moving. Bid on jobs that match your routes and capacity, reduce empty miles, and grow your business with a network of verified exporters.
                  </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

    </main>
  );
}
