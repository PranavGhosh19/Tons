
"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageSquare } from "lucide-react";
import Link from "next/link";

const faqs = [
    {
        question: "How do I post a shipment request as an exporter?",
        answer: "Navigate to your Exporter Dashboard and click the 'New Shipment Request' button. Fill in all the required details about your cargo, origin, destination, and desired timelines. You can save it as a draft or schedule it to go live for bidding."
    },
    {
        question: "How does the bidding process work for carriers?",
        answer: "As a carrier, you can browse available shipments in the 'Find Shipments' section. When a shipment is 'live', you can place a bid. The auction is a reverse auction, meaning the lowest bid is the winning one. You can see the current lowest bid and place a lower one to compete."
    },
    {
        question: "What happens after I accept a bid?",
        answer: "Once an exporter accepts a carrier's bid, the shipment is 'awarded'. Both parties will receive contact information to coordinate the logistics. All communication regarding pickup, delivery, and documentation should happen directly between the exporter and the awarded carrier."
    },
    {
        question: "How do payments work?",
        answer: "Currently, our platform facilitates the connection and bidding process. All financial transactions, including payment for the shipment, are handled directly between the exporter and the carrier outside of the platform. We plan to introduce secure on-platform payments in the future."
    },
     {
        question: "Can I edit a shipment request after it's live?",
        answer: "No, once a shipment is live and accepting bids, it cannot be edited to ensure a fair bidding process for all carriers. If you need to make significant changes, you would need to cancel the current shipment and post a new one. You can edit a shipment at any time while it is in 'draft' or 'scheduled' status."
    }
]

export default function SupportPage() {
    const { toast } = useToast();

    return (
        <div className="container py-12 md:py-16">
            <div className="text-center mb-12">
                <h1 className="text-4xl sm:text-5xl font-bold font-headline">Support Center</h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">We're here to help. Find answers to common questions or get in touch with our team.</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-12 items-start">
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-bold mb-6 font-headline">Frequently Asked Questions</h2>
                    <Accordion type="single" collapsible className="w-full">
                        {faqs.map((faq, index) => (
                            <AccordionItem value={`item-${index}`} key={index}>
                                <AccordionTrigger className="text-left font-semibold text-lg hover:no-underline">
                                    {faq.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-base text-muted-foreground">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>

                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Contact Us</CardTitle>
                            <CardDescription>Can't find an answer? Reach out to us.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <Button asChild className="w-full">
                                <Link href="mailto:support@shipshape.com">
                                    <Mail className="mr-2 h-4 w-4" />
                                    Email Us
                                </Link>
                           </Button>
                           <Button variant="outline" className="w-full" onClick={() => toast({ title: "Coming Soon!", description: "Live chat will be available soon."})}>
                               <MessageSquare className="mr-2 h-4 w-4" />
                               Live Chat
                           </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
