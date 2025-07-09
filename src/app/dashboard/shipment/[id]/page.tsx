
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, collection, query, orderBy, onSnapshot, DocumentData, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export default function ShipmentDetailPage() {
  const [user, setUser] = useState<User | null>(null);
  const [shipment, setShipment] = useState<DocumentData | null>(null);
  const [bids, setBids] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const shipmentId = params.id as string;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchShipment = useCallback(async () => {
    if (!user || !shipmentId) return;
    setLoading(true);
    try {
      const shipmentDocRef = doc(db, "shipments", shipmentId);
      const docSnap = await getDoc(shipmentDocRef);

      if (docSnap.exists()) {
        const shipmentData = docSnap.data();
        if (shipmentData.exporterId === user.uid) {
            setShipment({ id: docSnap.id, ...shipmentData });
        } else {
            toast({ title: "Error", description: "You are not authorized to view this page.", variant: "destructive" });
            router.push("/dashboard/exporter");
        }
      } else {
        toast({ title: "Error", description: "Shipment not found.", variant: "destructive" });
        router.push("/dashboard/exporter");
      }
    } catch (error) {
      console.error("Error fetching shipment: ", error);
      toast({ title: "Error", description: "Failed to fetch shipment details.", variant: "destructive" });
    } finally {
        // We set loading to false in the bids listener
    }
  }, [user, shipmentId, router, toast]);

  useEffect(() => {
    if (user) {
      fetchShipment();
    }
  }, [user, fetchShipment]);

  useEffect(() => {
    if (!shipmentId) return;

    const bidsQuery = query(collection(db, "shipments", shipmentId, "bids"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(bidsQuery, (querySnapshot) => {
      const bidsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBids(bidsData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching bids: ", error);
        toast({ title: "Error", description: "Failed to fetch bids in real-time.", variant: "destructive" });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [shipmentId, toast]);

  if (loading) {
    return (
      <div className="container py-10">
        <Skeleton className="h-8 w-32 mb-8" />
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
            <div className="space-y-6">
                 <Skeleton className="h-32 w-full" />
            </div>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return null; // or a not found component
  }

  return (
    <div className="container py-10">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
        </Button>
        <div className="grid md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-headline">{shipment.productName}</CardTitle>
                        <CardDescription>Shipment Details</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
                        <div><span className="font-semibold text-muted-foreground">Origin Port: </span>{shipment.origin?.portOfLoading}</div>
                        <div><span className="font-semibold text-muted-foreground">Destination Port: </span>{shipment.destination?.portOfDelivery}</div>
                        <div><span className="font-semibold text-muted-foreground">Departure Date: </span>{shipment.departureDate ? format(shipment.departureDate.toDate(), "PPP") : 'N/A'}</div>
                        <div><span className="font-semibold text-muted-foreground">Delivery Deadline: </span>{shipment.deliveryDeadline ? format(shipment.deliveryDeadline.toDate(), "PPP") : 'N/A'}</div>
                        <div className="md:col-span-2 pt-2"><p className="font-semibold text-muted-foreground mb-1">Cargo Information</p><p>{shipment.cargo?.type || 'General'} - {shipment.cargo?.quantity} units, {shipment.cargo?.weight}kg</p></div>
                        {shipment.specialInstructions && <div className="md:col-span-2 pt-2"><p className="font-semibold text-muted-foreground mb-1">Special Instructions</p><p>{shipment.specialInstructions}</p></div>}
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Bids Received</CardTitle>
                        <CardDescription>
                            {bids.length > 0 ? `A total of ${bids.length} bids have been placed on this shipment.` : "No bids have been placed yet."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {bids.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Carrier</TableHead>
                                        <TableHead>Bid Amount (USD)</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bids.map((bid) => (
                                        <TableRow key={bid.id}>
                                            <TableCell className="font-medium">{bid.carrierName}</TableCell>
                                            <TableCell>${bid.bidAmount.toLocaleString()}</TableCell>
                                            <TableCell>{bid.createdAt ? format(bid.createdAt.toDate(), "Pp") : 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm">Accept Bid</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                             <div className="text-center py-8 text-muted-foreground">
                                <p>Check back soon for bids from our carrier network.</p>
                             </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                <Card className="bg-secondary">
                    <CardHeader>
                        <CardTitle>Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold font-headline text-accent-foreground">Accepting Bids</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
