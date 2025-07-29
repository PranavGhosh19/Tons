
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Users, Ship, Anchor, Building } from "lucide-react";
import { collection, query, where, getDocs, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type AnalyticsView = "exporters" | "carriers" | "shipments";

const SidebarNav = ({ activeView, setView }: { activeView: AnalyticsView, setView: (view: AnalyticsView) => void }) => {
    const navItems = [
        { id: "shipments", label: "Shipments", icon: Ship },
        { id: "exporters", label: "Exporters", icon: Anchor },
        { id: "carriers", label: "Carriers", icon: Users },
    ] as const;

    return (
        <nav className="flex flex-col gap-2">
            {navItems.map(item => (
                <Button
                    key={item.id}
                    variant={activeView === item.id ? "secondary" : "ghost"}
                    className="justify-start"
                    onClick={() => setView(item.id)}
                >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                </Button>
            ))}
        </nav>
    );
}

const AnalyticsContent = ({ view }: { view: AnalyticsView }) => {
    const [exporters, setExporters] = useState<DocumentData[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (view === 'exporters') {
            const fetchExporters = async () => {
                setLoading(true);
                try {
                    const q = query(collection(db, "users"), where("userType", "==", "exporter"));
                    const querySnapshot = await getDocs(q);
                    const exportersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setExporters(exportersList);
                } catch (error) {
                    toast({
                        title: "Error",
                        description: "Could not fetch exporter data.",
                        variant: "destructive"
                    });
                    console.error("Error fetching exporters: ", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchExporters();
        }
    }, [view, toast]);

    const contentMap = {
        shipments: {
            title: "Shipment Analytics",
            description: "Insights into shipment volumes, statuses, and routes.",
            content: (
                <div className="border rounded-lg p-12 text-center bg-card dark:bg-card">
                    <div className="flex justify-center mb-4">
                        <BarChart className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Detailed Analytics Coming Soon</h2>
                    <p className="text-muted-foreground">We're working on bringing you powerful insights. Stay tuned!</p>
                </div>
            )
        },
        exporters: {
            title: "Exporter Directory",
            description: "A list of all registered exporters on the platform.",
            content: (
                <>
                    {loading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : exporters.length > 0 ? (
                        <div className="border rounded-lg overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Legal Name</TableHead>
                                        <TableHead>Trade Name</TableHead>
                                        <TableHead className="hidden md:table-cell">Address</TableHead>
                                        <TableHead className="hidden lg:table-cell">GSTIN</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {exporters.map((exporter) => (
                                        <TableRow key={exporter.id}>
                                            <TableCell className="font-medium">{exporter.companyDetails?.legalName || 'N/A'}</TableCell>
                                            <TableCell>{exporter.companyDetails?.tradeName || 'N/A'}</TableCell>
                                            <TableCell className="hidden md:table-cell">{exporter.companyDetails?.address || 'N/A'}</TableCell>
                                            <TableCell className="hidden lg:table-cell">{exporter.gstin || 'N/A'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                         <div className="border rounded-lg p-12 text-center bg-card dark:bg-card">
                            <div className="flex justify-center mb-4">
                                <Building className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <h2 className="text-xl font-semibold mb-2">No Exporters Found</h2>
                            <p className="text-muted-foreground">There are currently no exporters registered on the platform.</p>
                        </div>
                    )}
                </>
            )
        },
        carriers: {
            title: "Carrier Analytics",
            description: "Metrics on carrier engagement, bidding patterns, and performance.",
            content: (
                <div className="border rounded-lg p-12 text-center bg-card dark:bg-card">
                    <div className="flex justify-center mb-4">
                        <Users className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Detailed Analytics Coming Soon</h2>
                    <p className="text-muted-foreground">We're working on bringing you powerful insights. Stay tuned!</p>
                </div>
            )
        }
    };

    const currentContent = contentMap[view];

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>{currentContent.title}</CardTitle>
                <CardDescription>{currentContent.description}</CardDescription>
            </CardHeader>
            <CardContent>
                 {currentContent.content}
            </CardContent>
        </Card>
    );
};


export default function AnalyticsPage() {
    const [activeView, setActiveView] = useState<AnalyticsView>("exporters");

    return (
        <div className="container py-6 md:py-10">
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold font-headline">Platform Analytics</h1>
                <p className="text-muted-foreground">An overview of platform activity and key metrics.</p>
            </div>

            <div className="grid md:grid-cols-4 gap-8 items-start">
                <div className="md:col-span-1">
                    <SidebarNav activeView={activeView} setView={setActiveView} />
                </div>
                <div className="md:col-span-3">
                    <AnalyticsContent view={activeView} />
                </div>
            </div>
        </div>
    );
}
