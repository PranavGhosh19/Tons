
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, collection, query, orderBy, onSnapshot, DocumentData, Timestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Rocket, Pencil, Clock } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function ShipmentDetailPage() {
  const [user, setUser] = useState<User | null>(null);
  const [shipment, setShipment] = useState<DocumentData | null>(null);
  const [bids, setBids] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (!user || !shipmentId) return;

    const shipmentDocRef = doc(db, "shipments", shipmentId);
    const unsubscribeShipment = onSnapshot(shipmentDocRef, (docSnap) => {
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
      setLoading(false);
    }, (error) => {
        console.error("Error fetching shipment: ", error);
        toast({ title: "Error", description: "Failed to fetch shipment details.", variant: "destructive" });
        setLoading(false);
    });

    return () => unsubscribeShipment();

  }, [user, shipmentId, router, toast]);

  useEffect(() => {
    if (!shipmentId || shipment?.status === 'draft') {
        setBids([]);
        return;
    };

    const bidsQuery = query(collection(db, "shipments", shipmentId, "bids"), orderBy("createdAt", "desc"));
    
    const unsubscribeBids = onSnapshot(bidsQuery, (querySnapshot) => {
      const bidsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBids(bidsData);
    }, (error) => {
        console.error("Error fetching bids: ", error);
        toast({ title: "Error", description: "Failed to fetch bids in real-time.", variant: "destructive" });
    });

    return () => unsubscribeBids();
  }, [shipmentId, shipment?.status, toast]);

  const handleGoLive = async () => {
    if (!shipmentId) return;
    setIsSubmitting(true);
    try {
        const shipmentDocRef = doc(db, "shipments", shipmentId);
        await updateDoc(shipmentDocRef, { status: 'live' });
        toast({ title: "Success!", description: "Your shipment is now live for bidding."});
    } catch (error) {
        console.error("Error going live: ", error);
        toast({ title: "Error", description: "Could not make the shipment live.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleAcceptBid = async (bid: DocumentData) => {
    if (!shipmentId) return;
    setIsSubmitting(true);
    try {
        const shipmentDocRef = doc(db, "shipments", shipmentId);
        await updateDoc(shipmentDocRef, { 
            status: 'awarded',
            winningBidId: bid.id,
            winningCarrierId: bid.carrierId,
            winningCarrierName: bid.carrierName,
            winningBidAmount: bid.bidAmount
        });
        toast({ title: "Bid Awarded!", description: `You have accepted the bid from ${bid.carrierName}.`});
    } catch (error) {
        console.error("Error accepting bid: ", error);
        toast({ title: "Error", description: "Could not accept the bid.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }


  if (loading) {
    return (
      <div className="container py-6 md:py-10">
        <Skeleton className="h-8 w-32 mb-8" />
        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
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

  const getStatusInfo = () => {
    switch(shipment.status) {
        case 'draft':
            return { text: "Draft", description: "This shipment is not yet live." };
        case 'scheduled':
            if (shipment.goLiveAt) {
                return { text: "Scheduled", description: `Bidding is set for ${format(shipment.goLiveAt.toDate(), "PPp")}` };
            }
            return { text: "Scheduled", description: "This shipment is scheduled to go live." };
        case 'live':
            return { text: "Accepting Bids", description: "This shipment is live for carriers to bid on." };
        case 'awarded':
            return { text: "Awarded", description: `Awarded to ${shipment.winningCarrierName || 'a carrier'}.` };
        default:
            return { text: "Status Unknown", description: "" };
    }
  }

  const statusInfo = getStatusInfo();
  
  const hasDimensions = shipment.cargo?.dimensions?.length && shipment.cargo?.dimensions?.width && shipment.cargo?.dimensions?.height;

  return (
    <div className="container py-6 md:py-10">
        <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" onClick={() => router.push('/dashboard/exporter')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Button>
            {(shipment.status === 'draft' || shipment.status === 'scheduled') && (
                <Button variant="outline" onClick={() => router.push(`/dashboard/exporter?edit=${shipmentId}`)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Shipment
                </Button>
            )}
        </div>
        <div className="grid lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
                <Card className="bg-white dark:bg-card">
                    <CardHeader>
                        <CardTitle className="text-2xl sm:text-3xl font-headline">{shipment.productName}</CardTitle>
                        <CardDescription>Shipment Details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 text-sm">
                        <div className="grid md:grid-cols-2 gap-4 border-b pb-6">
                             {shipment.shipmentType && <div><span className="font-semibold text-muted-foreground block mb-1">Shipment Type</span>{shipment.shipmentType}</div>}
                             {shipment.hsnCode && <div><span className="font-semibold text-muted-foreground block mb-1">HSN Code</span>{shipment.hsnCode}</div>}
                             {shipment.modeOfShipment && <div className="md:col-span-2"><span className="font-semibold text-muted-foreground block mb-1">Mode of Shipment</span>{shipment.modeOfShipment}</div>}
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 border-b pb-6">
                             <div><span className="font-semibold text-muted-foreground block mb-1">Origin Port</span>{shipment.origin?.portOfLoading}</div>
                             <div><span className="font-semibold text-muted-foreground block mb-1">Destination Port</span>{shipment.destination?.portOfDelivery}</div>
                             {shipment.origin?.zipCode && <div><span className="font-semibold text-muted-foreground block mb-1">Origin Zip</span>{shipment.origin.zipCode}</div>}
                             {shipment.destination?.zipCode && <div><span className="font-semibold text-muted-foreground block mb-1">Destination Zip</span>{shipment.destination.zipCode}</div>}
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 border-b pb-6">
                             <div><span className="font-semibold text-muted-foreground block mb-1">Departure Date</span>{shipment.departureDate ? format(shipment.departureDate.toDate(), "PPP") : 'N/A'}</div>
                             <div><span className="font-semibold text-muted-foreground block mb-1">Delivery Deadline</span>{shipment.deliveryDeadline ? format(shipment.deliveryDeadline.toDate(), "PPP") : 'N/A'}</div>
                        </div>
                        <div className="space-y-4">
                            <p className="font-semibold text-foreground">Cargo Information</p>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div><span className="font-semibold text-muted-foreground block mb-1">Cargo Type</span>{shipment.cargo?.type || 'General'}</div>
                                {shipment.cargo?.packageType && <div><span className="font-semibold text-muted-foreground block mb-1">Package Type</span>{shipment.cargo.packageType}</div>}
                                <div><span className="font-semibold text-muted-foreground block mb-1">Weight</span>{shipment.cargo?.weight} kg</div>
                                {hasDimensions && <div className="md:col-span-2"><span className="font-semibold text-muted-foreground block mb-1">Dimensions (LxWxH)</span>{shipment.cargo.dimensions.length} x {shipment.cargo.dimensions.width} x {shipment.cargo.dimensions.height} {shipment.cargo.dimensions.unit || ''}</div>}
                            </div>
                        </div>

                        {shipment.specialInstructions && <div className="pt-2"><p className="font-semibold text-muted-foreground mb-1">Special Instructions</p><p>{shipment.specialInstructions}</p></div>}
                    </CardContent>
                </Card>

                 {(shipment.status !== 'draft') && (
                    <Card className="bg-white dark:bg-card">
                        <CardHeader>
                            <CardTitle>Bids Received</CardTitle>
                            <CardDescription>
                                {bids.length > 0 ? `A total of ${bids.length} bids have been placed on this shipment.` : "No bids have been placed yet."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            {bids.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Carrier</TableHead>
                                            <TableHead>Bid Amount (USD)</TableHead>
                                            <TableHead className="hidden sm:table-cell">Date</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bids.map((bid) => (
                                            <TableRow key={bid.id} className={shipment.winningBidId === bid.id ? "bg-green-100 dark:bg-green-900" : ""}>
                                                <TableCell className="font-medium">{bid.carrierName}</TableCell>
                                                <TableCell>${bid.bidAmount.toLocaleString()}</TableCell>
                                                <TableCell className="hidden sm:table-cell">{bid.createdAt ? format(bid.createdAt.toDate(), "PPpp") : 'N/A'}</TableCell>
                                                <TableCell className="text-right">
                                                    {shipment.status === 'awarded' ? (
                                                        shipment.winningBidId === bid.id && <Badge variant="success">Awarded</Badge>
                                                    ) : (
                                                        <Button size="sm" onClick={() => handleAcceptBid(bid)} disabled={isSubmitting}>Accept Bid</Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    {shipment.status === 'scheduled' && shipment.goLiveAt ? (
                                         <div className="flex items-center justify-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            <p>Bidding for this shipment is set for {format(shipment.goLiveAt.toDate(), "PPp")}</p>
                                         </div>
                                    ) : (
                                         <p>Check back soon for bids from our carrier network.</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                 )}
            </div>
            <div className="space-y-6 lg:sticky lg:top-24">
                <Card className="bg-white dark:bg-card">
                    <CardHeader>
                        <CardTitle>Status</CardTitle>
                        <CardDescription>{statusInfo.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold font-headline text-accent-foreground capitalize">{statusInfo.text}</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
