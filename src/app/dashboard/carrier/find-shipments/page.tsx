
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, getDocs, DocumentData, orderBy, doc, getDoc, addDoc, Timestamp, setDoc, where, collectionGroup } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Info, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function FindShipmentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [carrierName, setCarrierName] = useState<string>("");
  const [shipments, setShipments] = useState<DocumentData[]>([]);
  const [registeredShipmentIds, setRegisteredShipmentIds] = useState<Set<string>>(new Set());
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
  
  const loadInitialData = useCallback(async (uid: string) => {
    setLoading(true);
    try {
        const shipmentsQuery = query(collection(db, 'shipments'), orderBy('createdAt', 'desc'));
        const registrationsQuery = query(collectionGroup(db, 'register'), where('carrierId', '==', uid));

        const [shipmentsSnapshot, registrationsSnapshot] = await Promise.all([
            getDocs(shipmentsQuery),
            getDocs(registrationsQuery)
        ]);
        
        const shipmentsList = shipmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const registrationIds = new Set(registrationsSnapshot.docs.map(doc => doc.ref.parent.parent!.id));

        setShipments(shipmentsList);
        setRegisteredShipmentIds(registrationIds);
        
    } catch (error) {
        console.error("Error fetching initial data: ", error);
        toast({ title: "Error", description: "Could not fetch necessary data.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
        loadInitialData(user.uid);
    } else {
        setLoading(false);
    }
  }, [user, loadInitialData]);

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

  const handleRegisterInterest = async () => {
    if (!user || !selectedShipment) {
        toast({ title: "Error", description: "User or shipment not found.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
        const registrationRef = doc(db, "shipments", selectedShipment.id, "register", user.uid);
        await setDoc(registrationRef, {
            carrierId: user.uid,
            registeredAt: Timestamp.now(),
        });
        toast({ title: "Success", description: "You have registered your interest for this shipment." });
        setRegisteredShipmentIds(prev => new Set(prev).add(selectedShipment.id));
        setIsBidDialogOpen(false);
    } catch (error) {
        console.error("Error registering interest: ", error);
        toast({ title: "Error", description: "Failed to register your interest.", variant: "destructive" });
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

  const renderStatusMessage = () => {
    if (!selectedShipment) return null;

    switch (selectedShipment.status) {
        case 'draft':
            return 'This shipment is not yet scheduled.';
        case 'scheduled':
            if (selectedShipment.goLiveAt) {
                return `Bidding for this shipment is set for ${format(selectedShipment.goLiveAt.toDate(), "PPp")}`;
            }
            return 'This shipment is scheduled to go live soon.';
        case 'awarded':
            return selectedShipment.winningCarrierId === user?.uid
                ? 'Congratulations! You won this bid.'
                : 'This shipment has been awarded to another carrier.';
        default:
            return 'Bidding for this shipment is closed.';
    }
  };


  if (loading) {
    return (
        <div className="container py-6 md:py-10">
            <div className="flex justify-between items-center mb-8">
                <Skeleton className="h-10 w-48" />
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
    )
  }

  const hasDimensions = selectedShipment?.cargo?.dimensions?.length && selectedShipment?.cargo?.dimensions?.width && selectedShipment?.cargo?.dimensions?.height;
  const isAlreadyRegistered = selectedShipment && registeredShipmentIds.has(selectedShipment.id);

  return (
    <div className="container py-6 md:py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Find Shipments</h1>
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
                <TableHead className="hidden lg:table-cell text-right">Bid On</TableHead>
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
                    <TableCell className="hidden lg:table-cell text-right">{shipment.deliveryDeadline ? format(shipment.deliveryDeadline.toDate(), "dd/MM/yyyy") : 'N/A'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-right">{shipment.goLiveAt ? format(shipment.goLiveAt.toDate(), "dd/MM/yyyy p") : 'N/A'}</TableCell>
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
        <div className="border rounded-lg p-12 text-center bg-card dark:bg-card">
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

                              <div><span className="font-semibold">Departure: </span>{selectedShipment.departureDate ? format(selectedShipment.departureDate.toDate(), "dd/MM/yyyy") : 'N/A'}</div>
                              <div><span className="font-semibold">Deadline: </span>{selectedShipment.deliveryDeadline ? format(selectedShipment.deliveryDeadline.toDate(), "dd/MM/yyyy") : 'N/A'}</div>
                              <div className="md:col-span-2"><span className="font-semibold">Cargo: </span>{selectedShipment.cargo?.type || 'General'} - {selectedShipment.cargo?.weight}kg</div>
                              {selectedShipment.cargo?.packageType && <div className="md:col-span-2"><span className="font-semibold">Package: </span>{selectedShipment.cargo.packageType}</div>}
                              {hasDimensions && <div className="md:col-span-2"><span className="font-semibold">Dimensions (LxWxH): </span>{selectedShipment.cargo.dimensions.length} x {selectedShipment.cargo.dimensions.width} x {selectedShipment.cargo.dimensions.height} {selectedShipment.cargo.dimensions.unit || ''}</div>}
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
                              <p className="text-muted-foreground text-center">
                                {renderStatusMessage()}
                              </p>
                          </CardContent>
                        </Card>
                      )}
                  </div>
              )}
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsBidDialogOpen(false)}>Cancel</Button>
                  {selectedShipment?.status === 'scheduled' && (
                    isAlreadyRegistered ? (
                        <Button variant="outline" disabled>
                            <Check className="mr-2 h-4 w-4" />
                            Registered
                        </Button>
                    ) : (
                        <Button onClick={handleRegisterInterest} disabled={isSubmitting}>
                            {isSubmitting ? 'Registering...' : 'I want to Bid'}
                        </Button>
                    )
                  )}
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

    