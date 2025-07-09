
"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Anchor, ArrowRight, Truck } from "lucide-react";

const exporterSteps = [
    {
        number: 1,
        title: "Post Your Shipment",
        description: "Easily create a new shipment request 24 hours before going live with all the necessary details: what you're shipping, where it's going, and your required timelines. Our intuitive form makes it simple."
    },
    {
        number: 2,
        title: "Receive Competitive Bids",
        description: "Once your request is live, our network of vetted carriers will start placing bids. Watch in real-time bidding as you receive competitive offers for your shipment."
    },
    {
        number: 3,
        title: "Choose the Best Offer",
        description: "Review the bids, compare carrier profiles, and select the offer that best fits your budget and needs. Award the shipment and get your goods moving."
    },
    {
        number: 4,
        title: "Optional: Hire an Expert for Tracking",
        description: "For extra peace of mind, you can hire one of our logistics experts to manage the tracking of your shipment from start to finish. They'll handle all the details, so you can focus on your business."
    }
];

const carrierSteps = [
    {
        number: 1,
        title: "Find Shipments",
        description: "Browse a live marketplace of available shipments from exporters around the world. Filter by route, cargo type, and more to find jobs that match your capacity."
    },
    {
        number: 2,
        title: "Place Your Bid",
        description: "Found a shipment you can handle? Submit your best bid. Our system is transparent, so you can compete fairly for every opportunity."
    },
    {
        number: 3,
        title: "Win and Deliver",
        description: "If your bid is selected, you'll be notified immediately. Coordinate with the exporter, handle the shipment, and get paid promptly upon successful delivery."
    }
];


const Step = ({ number, title, description }: { number: number; title: string; description: string }) => (
    <Card className="p-6 bg-card/80">
        <CardContent className="flex items-start gap-6 p-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                {number}
            </div>
            <div>
                <h3 className="text-xl font-bold mb-2 font-headline">{title}</h3>
                <p className="text-muted-foreground">{description}</p>
            </div>
        </CardContent>
    </Card>
);


export default function HowItWorksPage() {
    const [activeTab, setActiveTab] = useState("exporters");

    return (
        <div className="bg-background">
            <section className="w-full py-20 md:py-28">
                <div className="container px-4 md:px-6">
                    <div className="flex flex-col items-center space-y-4 text-center">
                        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl font-headline">
                            How It Works
                        </h1>
                        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                            A streamlined process for both sides of the shipping equation.
                        </p>
                    </div>

                    <div className="mx-auto max-w-3xl pt-12">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 h-12">
                                <TabsTrigger value="exporters" className="h-full">
                                    <Anchor className="mr-2 h-5 w-5" /> For Exporters
                                </TabsTrigger>
                                <TabsTrigger value="carriers" className="h-full">
                                    <Truck className="mr-2 h-5 w-5" /> For Carriers
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="exporters">
                                <div className="space-y-6 pt-8">
                                    {exporterSteps.map(step => (
                                        <Step key={step.number} {...step} />
                                    ))}
                                </div>
                            </TabsContent>
                            <TabsContent value="carriers">
                                <div className="space-y-6 pt-8">
                                    {carrierSteps.map(step => (
                                        <Step key={step.number} {...step} />
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </section>

            <section className="w-full py-20 md:py-28 bg-secondary">
                <div className="container">
                    <div className="flex flex-col items-center space-y-4 text-center">
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
                            Ready to Get Started?
                        </h2>
                        <p className="max-w-[600px] text-muted-foreground md:text-lg">
                            Join the platform that's revolutionizing the freight industry.
                        </p>
                        <Button asChild size="lg" className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg transition-transform hover:scale-105">
                            <Link href="/signup">
                                Sign Up Now <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    )
}
