
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, getDocs, DocumentData, orderBy, doc, getDoc, collectionGroup, Timestamp, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type BidWithShipment = {
  bid: DocumentData;
  shipment: DocumentData;
};

const PageSkeleton = () => (
    <div className="container py-6 md:py-10">
        <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-12 w-full mb-8" />
        <Skeleton className="h-96 w-full" />
    </div>
);

export default function MyBidsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [bidsWithShipments, setBidsWithShipments] = useState<BidWithShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("all");
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data()?.userType === 'carrier') {
           setUser(currentUser);
        } else {
            router.push('/dashboard');
        }
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchBidsAndShipments = useCallback(async (userId: string) => {
    setLoading(true);
    try {
        // Step 1: Fetch all bids by the carrier
        const bidsQuery = query(
            collectionGroup(db, 'bids'),
            where('carrierId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const bidsSnapshot = await getDocs(bidsQuery);
        const bids = bidsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), shipmentId: doc.ref.parent.parent!.id }));

        if (bids.length === 0) {
            setBidsWithShipments([]);
            setLoading(false);
            return;
        }

        // Step 2: Get unique shipment IDs
        const shipmentIds = [...new Set(bids.map(bid => bid.shipmentId))];

        // Step 3: Fetch all required shipments in a single query if possible, or batched
        const shipmentsData: { [key: string]: DocumentData } = {};
        // Firestore 'in' query is limited to 30 items. Batch if necessary.
        const batches = [];
        for (let i = 0; i < shipmentIds.length; i += 30) {
            batches.push(shipmentIds.slice(i, i + 30));
        }

        for (const batch of batches) {
             const shipmentsQuery = query(collection(db, 'shipments'), where('__name__', 'in', batch));
             const shipmentsSnapshot = await getDocs(shipmentsQuery);
             shipmentsSnapshot.forEach(doc => {
                shipmentsData[doc.id] = { id: doc.id, ...doc.data() };
             });
        }
        
        // Step 4: Combine bids with their shipment data
        const combinedData: BidWithShipment[] = bids
            .map(bid => ({
                bid,
                shipment: shipmentsData[bid.shipmentId]
            }))
            .filter(item => item.shipment); // Filter out any bids where shipment data might be missing

        setBidsWithShipments(combinedData);
    } catch (error) {
        console.error("Error fetching bids and shipments:", error);
        toast({ title: "Error", description: "Failed to fetch your bids.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
        fetchBidsAndShipments(user.uid);
    }
  }, [user, fetchBidsAndShipments]);
  
  const getBidStatus = (item: BidWithShipment): { text: string; variant: "success" | "secondary" | "destructive" | "outline" | "default" } => {
    const { bid, shipment } = item;
    
    if (shipment.status === 'awarded') {
        if (shipment.winningBidId === bid.id) {
            return { text: 'Won', variant: 'success' };
        } else {
            return { text: 'Lost', variant: 'destructive' };
        }
    }

    if (shipment.status === 'live') {
        // This requires fetching all bids for the shipment to compare. For simplicity here, we mark as active.
        // A more complex implementation could pass lowestBid info.
        return { text: 'Live', variant: 'default' };
    }
    
    return { text: shipment.status, variant: 'secondary' };
  };

  const filteredBids = useMemo(() => {
    if (currentTab === 'all') return bidsWithShipments;
    return bidsWithShipments.filter(item => {
        const status = getBidStatus(item).text.toLowerCase();
        if (currentTab === 'live' && status === 'live') return true;
        if (currentTab === 'won' && status === 'won') return true;
        if (currentTab === 'lost' && (status === 'lost' || (item.shipment.status === 'awarded' && status !== 'won'))) return true;
        return false;
    });
  }, [bidsWithShipments, currentTab]);

  const handleRowClick = (shipmentId: string, status: string) => {
    if (status === 'live') {
        router.push(`/dashboard/carrier/shipment/${shipmentId}`);
    } else {
        router.push(`/dashboard/shipment/${shipmentId}`);
    }
  };

  const renderTable = (data: BidWithShipment[]) => {
    if (data.length === 0) {
        return (
             <div className="border rounded-lg p-12 text-center bg-card dark:bg-card mt-8">
                <h2 className="text-xl font-semibold mb-2">No bids in this category</h2>
                <p className="text-muted-foreground">You have not placed any bids that match this filter.</p>
            </div>
        )
    }
    return (
        <div className="border rounded-lg overflow-x-auto mt-8">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Your Bid (USD)</TableHead>
                    <TableHead className="hidden md:table-cell">Bid Placed On</TableHead>
                    <TableHead className="hidden md:table-cell">Shipment Destination</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {data.map((item) => {
                    const status = getBidStatus(item);
                    return (
                        <TableRow key={item.bid.id} onClick={() => handleRowClick(item.shipment.id, item.shipment.status)} className="cursor-pointer">
                            <TableCell className="font-medium">{item.shipment.productName || 'N/A'}</TableCell>
                            <TableCell>${item.bid.bidAmount.toLocaleString()}</TableCell>
                            <TableCell className="hidden md:table-cell">{format(item.bid.createdAt.toDate(), "dd/MM/yyyy p")}</TableCell>
                            <TableCell className="hidden md:table-cell">{item.shipment.destination?.portOfDelivery || 'N/A'}</TableCell>
                            <TableCell className="text-center">
                                <Badge variant={status.variant} className={cn("capitalize", { "animate-blink bg-green-500/80": status.text === 'Live' })}>
                                    {status.text}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    );
                })}
                </TableBody>
            </Table>
        </div>
    )
  }

  if (loading) {
    return <PageSkeleton />;
  }
  
  return (
    <div className="container py-6 md:py-10">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">My Bids</h1>
      </div>
      <p className="text-muted-foreground mb-8">Track the status of all your bids in one place.</p>
        
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList>
            <TabsTrigger value="all">All Bids</TabsTrigger>
            <TabsTrigger value="live">Live</TabsTrigger>
            <TabsTrigger value="won">Won</TabsTrigger>
            <TabsTrigger value="lost">Lost</TabsTrigger>
        </TabsList>
        <TabsContent value="all">{renderTable(filteredBids)}</TabsContent>
        <TabsContent value="live">{renderTable(filteredBids)}</TabsContent>
        <TabsContent value="won">{renderTable(filteredBids)}</TabsContent>
        <TabsContent value="lost">{renderTable(filteredBids)}</TabsContent>
      </Tabs>
      
      {!loading && bidsWithShipments.length === 0 && (
         <div className="border rounded-lg p-12 text-center bg-card dark:bg-card mt-8">
            <h2 className="text-xl font-semibold mb-2">You haven't placed any bids yet</h2>
            <p className="text-muted-foreground">Find shipments to bid on to get started.</p>
            <Button onClick={() => router.push('/dashboard/carrier/find-shipments')} className="mt-4">
                Find Shipments
            </Button>
        </div>
      )}
    </div>
  );
}
