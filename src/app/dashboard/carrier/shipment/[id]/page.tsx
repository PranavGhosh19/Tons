
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, collection, query, orderBy, onSnapshot, DocumentData, addDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function CarrierShipmentDetailPage() {
  const [user, setUser] = useState<User | null>(null);
  const [carrierName, setCarrierName] = useState<string>("");
  const [shipment, setShipment] = useState<DocumentData | null>(null);
  const [bids, setBids] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bidAmount, setBidAmount] = useState("");

  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const shipmentId = params.id as string;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data()?.userType === 'carrier') {
           setUser(currentUser);
           setCarrierName(userDoc.data()?.name || 'Anonymous Carrier');
        } else {
            router.push('/dashboard');
        }
      } else {
        router.push('/login');
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
        if (shipmentData.status !== 'live') {
            toast({ title: "Info", description: "Bidding for this shipment is closed.", variant: "default" });
            router.push("/dashboard/carrier");
        }
        setShipment({ id: docSnap.id, ...shipmentData });
      } else {
        toast({ title: "Error", description: "Shipment not found.", variant: "destructive" });
        router.push("/dashboard/carrier");
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
    if (!shipmentId) return;

    const bidsQuery = query(collection(db, "shipments", shipmentId, "bids"), orderBy("bidAmount", "asc"));
    
    const unsubscribeBids = onSnapshot(bidsQuery, (querySnapshot) => {
      const bidsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBids(bidsData);
    }, (error) => {
        console.error("Error fetching bids: ", error);
        toast({ title: "Error", description: "Failed to fetch bids.", variant: "destructive" });
    });

    return () => unsubscribeBids();
  }, [shipmentId, toast]);
  
  const lowestBidData = useMemo(() => {
    if (bids.length === 0) {
      return null;
    }
    // Bids are sorted by bidAmount asc, so the first one is the lowest.
    return bids[0];
  }, [bids]);


  const handlePlaceBid = async () => {
    if (!user || !shipmentId || !bidAmount) {
      toast({ title: "Error", description: "Please enter a bid amount.", variant: "destructive" });
      return;
    }

    const newBidAmount = parseFloat(bidAmount);
    if (lowestBidData && newBidAmount > lowestBidData.bidAmount) {
      toast({
        title: "Invalid Bid",
        description: `Your bid must be less than or equal to the current lowest bid of $${lowestBidData.bidAmount.toLocaleString()}.`,
        variant: "destructive",
      });
      return;
    }

    if (shipment?.status !== 'live') {
      toast({ title: "Info", description: "This shipment is not currently accepting bids.", variant: "default" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "shipments", shipmentId, "bids"), {
        carrierId: user.uid,
        carrierName: carrierName,
        bidAmount: newBidAmount,
        createdAt: Timestamp.now(),
      });
      toast({ title: "Success", description: "Your bid has been placed." });
      setBidAmount("");
    } catch (error) {
      console.error("Error placing bid: ", error);
      toast({ title: "Error", description: "Failed to place your bid.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !shipment) {
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

  const hasDimensions = shipment.cargo?.dimensions?.length && shipment.cargo?.dimensions?.width && shipment.cargo?.dimensions?.height;

  return (
    <div className="container py-6 md:py-10">
      <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push('/dashboard/carrier')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to All Shipments
          </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white dark:bg-card">
                <CardHeader>
                    <CardTitle className="text-2xl sm:text-3xl font-headline">{shipment.productName}</CardTitle>
                    <CardDescription>From: {shipment.exporterName}</CardDescription>
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
                         <div><span className="font-semibold text-muted-foreground block mb-1">Departure Date</span>{shipment.departureDate ? format(shipment.departureDate.toDate(), "dd/MM/yyyy") : 'N/A'}</div>
                         <div><span className="font-semibold text-muted-foreground block mb-1">Delivery Deadline</span>{shipment.deliveryDeadline ? format(shipment.deliveryDeadline.toDate(), "dd/MM/yyyy") : 'N/A'}</div>
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
        </div>
        <div className="space-y-6 lg:sticky lg:top-24">
            <Card className="bg-white dark:bg-card">
              <CardHeader>
                <CardTitle>Live Bidding</CardTitle>
                <CardDescription>Place your bid for this shipment.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center justify-center p-4 bg-secondary rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-6 w-6 text-primary" />
                    <p className="text-sm text-muted-foreground">Lowest Bid</p>
                  </div>
                  <p className="text-2xl font-bold mt-1">{lowestBidData ? `$${lowestBidData.bidAmount.toLocaleString()}` : 'N/A'}</p>
                  {lowestBidData && (
                    <Badge variant={lowestBidData.carrierId === user?.uid ? 'success' : 'outline'} className="mt-2">
                      {lowestBidData.carrierId === user?.uid ? 'You' : 'Other Carrier'}
                    </Badge>
                  )}
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="bid-amount">Your Bid Amount (USD)</Label>
                    <div className="flex items-center">
                        <span className="bg-muted text-muted-foreground px-3 py-2 border border-r-0 rounded-l-md">$</span>
                        <Input
                        id="bid-amount"
                        type="number"
                        placeholder={lowestBidData ? `Must be < $${lowestBidData.bidAmount.toLocaleString()}` : "e.g., 2500"}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        disabled={isSubmitting}
                        className="rounded-l-none"
                        />
                    </div>
                </div>
                <Button onClick={handlePlaceBid} disabled={isSubmitting} className="w-full">
                    <Send className="mr-2 h-4 w-4" />
                    {isSubmitting ? 'Placing Bid...' : 'Place Bid'}
                </Button>
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

    

    