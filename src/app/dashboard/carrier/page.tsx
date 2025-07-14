
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, getDocs, DocumentData, orderBy, doc, getDoc, addDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function CarrierDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [carrierName, setCarrierName] = useState<string>("");
  const [shipments, setShipments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBidDialogOpen, setIsBidDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<DocumentData | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

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
  
  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const shipmentsQuery = query(collection(db, 'shipments'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(shipmentsQuery);
      const shipmentsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setShipments(shipmentsList);
    } catch (error: any) {
      console.error("Error fetching shipments: ", error);
      toast({ title: "Error", description: "Could not fetch available shipments.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
        fetchShipments();
    }
  }, [user, fetchShipments]);

  const handleOpenBidDialog = (shipment: DocumentData) => {
    setSelectedShipment(shipment);
    setIsBidDialogOpen(true);
    setBidAmount("");
  };

  const handleRowClick = (shipment: DocumentData) => {
    if (shipment.status === 'live') {
      router.push(`/dashboard/carrier/shipment/${shipment.id}`);
    } else {
      // For draft, awarded, etc., open the existing details dialog
      handleOpenBidDialog(shipment);
    }
  };

  const handlePlaceBid = async () => {
    if (!user || !selectedShipment || !bidAmount) {
      toast({ title: "Error", description: "Please enter a bid amount.", variant: "destructive" });
      return;
    }
    if (selectedShipment.status !== 'live') {
      toast({ title: "Info", description: "This shipment is not currently accepting bids.", variant: "default" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "shipments", selectedShipment.id, "bids"), {
        carrierId: user.uid,
        carrierName: carrierName,
        bidAmount: parseFloat(bidAmount),
        createdAt: Timestamp.now(),
      });
      toast({ title: "Success", description: "Your bid has been placed." });
      setIsBidDialogOpen(false);
      setSelectedShipment(null);
    } catch (error) {
      console.error("Error placing bid: ", error);
      toast({ title: "Error", description: "Failed to place your bid.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'live':
        return 'success';
      case 'awarded':
        return 'success';
      case 'draft':
      case 'scheduled':
        return 'secondary';
      default:
        return 'outline';
    }
  };


  if (loading || !user) {
    return (
        <div className="container py-6 md:py-10">
            <div className="flex justify-between items-center mb-8">
                <Skeleton className="h-10 w-48" />
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
    )
  }

  return (
    <div className="container py-6 md:py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Carrier Dashboard</h1>
      </div>

      {shipments.length > 0 ? (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="hidden sm:table-cell">Exporter</TableHead>
                <TableHead className="hidden md:table-cell">Origin</TableHead>
                <TableHead className="hidden md:table-cell">Destination</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Delivery Deadline</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((shipment) => {
                let statusBadge;
                if (shipment.status === 'awarded') {
                    if (shipment.winningCarrierId === user?.uid) {
                        statusBadge = <Badge variant="success">Awarded</Badge>;
                    } else {
                        statusBadge = <Badge variant="outline">Closed</Badge>;
                    }
                } else {
                    statusBadge = (
                        <Badge variant={getStatusVariant(shipment.status)} className={cn("capitalize", { "animate-blink bg-green-500/80": shipment.status === 'live' })}>
                            {shipment.status}
                        </Badge>
                    );
                }

                return (
                    <TableRow key={shipment.id} onClick={() => handleRowClick(shipment)} className="cursor-pointer">
                    <TableCell className="font-medium">{shipment.productName || 'N/A'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{shipment.exporterName || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">{shipment.origin?.portOfLoading || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">{shipment.destination?.portOfDelivery || 'N/A'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-right">{shipment.deliveryDeadline ? format(shipment.deliveryDeadline.toDate(), "PPP") : 'N/A'}</TableCell>
                    <TableCell className="text-center">
                        {statusBadge}
                    </TableCell>
                    </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center bg-white dark:bg-card">
          <h2 className="text-xl font-semibold mb-2">No shipments available right now</h2>
          <p className="text-muted-foreground">Please check back later for new opportunities.</p>
        </div>
      )}

      <Dialog open={isBidDialogOpen} onOpenChange={setIsBidDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                  <DialogTitle className="text-2xl font-headline">Shipment Details</DialogTitle>
                  <p className="text-muted-foreground">Review the shipment details and place your bid if available.</p>
              </DialogHeader>
              {selectedShipment && (
                  <div className="grid gap-6 py-4">
                      <Card>
                          <CardHeader>
                              <CardTitle>{selectedShipment.productName}</CardTitle>
                              <CardDescription>From: {selectedShipment.exporterName}</CardDescription>
                          </CardHeader>
                          <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
                              {selectedShipment.shipmentType && <div className="md:col-span-2"><span className="font-semibold">Shipment Type: </span>{selectedShipment.shipmentType}</div>}
                              {selectedShipment.hsnCode && <div><span className="font-semibold">HSN Code: </span>{selectedShipment.hsnCode}</div>}
                              {selectedShipment.modeOfShipment && <div><span className="font-semibold">Mode: </span>{selectedShipment.modeOfShipment}</div>}

                              <div><span className="font-semibold">Origin Port: </span>{selectedShipment.origin?.portOfLoading}</div>
                              <div><span className="font-semibold">Destination Port: </span>{selectedShipment.destination?.portOfDelivery}</div>
                              {selectedShipment.origin?.zipCode && <div><span className="font-semibold">Origin Zip: </span>{selectedShipment.origin?.zipCode}</div>}
                              {selectedShipment.destination?.zipCode && <div><span className="font-semibold">Destination Zip: </span>{selectedShipment.destination?.zipCode}</div>}

                              <div><span className="font-semibold">Departure: </span>{selectedShipment.departureDate ? format(selectedShipment.departureDate.toDate(), "PPP") : 'N/A'}</div>
                              <div><span className="font-semibold">Deadline: </span>{selectedShipment.deliveryDeadline ? format(selectedShipment.deliveryDeadline.toDate(), "PPP") : 'N/A'}</div>
                              <div className="md:col-span-2"><span className="font-semibold">Cargo: </span>{selectedShipment.cargo?.type || 'General'} - {selectedShipment.cargo?.weight}kg</div>
                              {(selectedShipment.cargo?.dimensions?.length && selectedShipment.cargo?.dimensions?.width && selectedShipment.cargo?.dimensions?.height) && <div className="md:col-span-2"><span className="font-semibold">Dimensions (LxWxH): </span>{selectedShipment.cargo.dimensions.length} x {selectedShipment.cargo.dimensions.width} x {selectedShipment.cargo.dimensions.height}</div>}
                              {selectedShipment.specialInstructions && <div className="md:col-span-2"><span className="font-semibold">Instructions: </span>{selectedShipment.specialInstructions}</div>}
                          </CardContent>
                      </Card>

                      {selectedShipment.status === 'live' ? (
                        <div className="grid gap-2">
                            <Label htmlFor="bid-amount">Your Bid Amount (USD)</Label>
                            <div className="flex items-center">
                                <span className="bg-muted text-muted-foreground px-3 py-2 border border-r-0 rounded-l-md">$</span>
                                <Input
                                id="bid-amount"
                                type="number"
                                placeholder="e.g., 2500"
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                disabled={isSubmitting}
                                className="rounded-l-none"
                                />
                            </div>
                        </div>
                      ) : (
                        <Card className="bg-secondary border-dashed">
                          <CardContent className="p-6 flex items-center justify-center gap-4">
                              <Info className="text-muted-foreground h-5 w-5" />
                              <p className="text-muted-foreground">
                                {
                                  selectedShipment.status === 'draft' ? 'This shipment is not yet accepting bids.' :
                                  selectedShipment.status === 'scheduled' && selectedShipment.goLiveDate ? `Bidding for this shipment will begin on ${format(selectedShipment.goLiveDate.toDate(), "Pp")}.` :
                                  selectedShipment.status === 'awarded' ?
                                      (selectedShipment.winningCarrierId === user?.uid ?
                                          'Congratulations! You won this bid.' :
                                          'This shipment has been awarded to another carrier.'
                                      ) :
                                  'Bidding for this shipment is closed.'
                                }
                              </p>
                          </CardContent>
                        </Card>
                      )}
                  </div>
              )}
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsBidDialogOpen(false)}>Cancel</Button>
                  {selectedShipment?.status === 'live' && (
                    <Button onClick={handlePlaceBid} disabled={isSubmitting}>
                        <Send className="mr-2 h-4 w-4" />
                        {isSubmitting ? 'Placing Bid...' : 'Place Bid'}
                    </Button>
                  )}
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
