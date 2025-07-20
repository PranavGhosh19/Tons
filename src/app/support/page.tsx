
"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageSquare, Send } from "lucide-react";

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

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Here you would typically handle form submission, e.g., send to an API endpoint
        toast({
            title: "Message Sent!",
            description: "Thank you for contacting us. We'll get back to you shortly.",
        });
        (e.target as HTMLFormElement).reset();
    }

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
                            <CardDescription>Can't find an answer? Send us a message.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-4" onSubmit={handleSubmit}>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input id="name" placeholder="John Doe" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input id="email" type="email" placeholder="you@example.com" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="subject">Subject</Label>
                                    <Input id="subject" placeholder="e.g., Question about bidding" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="message">Message</Label>
                                    <Textarea id="message" placeholder="Please describe your issue..." required />
                                </div>
                                <Button type="submit" className="w-full">
                                    <Send className="mr-2 h-4 w-4" />
                                    Send Message
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
