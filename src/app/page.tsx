
"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Ship, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Skeleton } from '@/components/ui/skeleton';

const insurancePartners = [
    { name: "SecureShip Insurance", logo: "https://placehold.co/150x60.png", hint: "insurance company" },
    { name: "Global Cargo Protect", logo: "https://placehold.co/150x60.png", hint: "logistics protect" },
    { name: "Marine Assure", logo: "https://placehold.co/150x60.png", hint: "shipping marine" },
    { name: "Freight Guardian", logo: "https://placehold.co/150x60.png", hint: "cargo freight" },
    { name: "TransitSure", logo: "https://placehold.co/150x60.png", hint: "transport transit" },
];

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

      <section className="w-full py-20 md:py-28">
        <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
                    Partnered with Leading Cargo Insurers
                </h2>
                <p className="max-w-[600px] text-muted-foreground md:text-lg">
                    Ensuring your shipments are protected every step of the way.
                </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 items-center justify-items-center">
                {insurancePartners.map((partner) => (
                    <div key={partner.name} className="grayscale hover:grayscale-0 transition-all">
                       <Image
                            src={partner.logo}
                            alt={`${partner.name} Logo`}
                            width={150}
                            height={60}
                            className="object-contain"
                            data-ai-hint={partner.hint}
                        />
                    </div>
                ))}
            </div>
        </div>
      </section>

    </main>
  );
}
