
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, collection, query, orderBy, onSnapshot, DocumentData, Timestamp, updateDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Clock, Shield, Users, Rocket, Pencil, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type RegisteredCarrier = {
    id: string;
    legalName?: string;
    registeredAt: Timestamp;
};

export default function ShipmentDetailPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [shipment, setShipment] = useState<DocumentData | null>(null);
  const [bids, setBids] = useState<DocumentData[]>([]);
  const [registeredCarriers, setRegisteredCarriers] = useState<RegisteredCarrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);


  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const shipmentId = params.id as string;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserType(userDoc.data()?.userType || null);
        } else {
            router.push('/login');
        }
      } else {
        router.push("/login");
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
        
        // This check is primarily for initial page load authorization.
        // More granular access control is handled by the `can...` variables below.
        setShipment({ id: docSnap.id, ...shipmentData });

      } else {
        toast({ title: "Error", description: "Shipment not found.", variant: "destructive" });
        router.push("/dashboard");
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
        console.error("Error fetching bids in real-time: ", error);
        toast({ title: "Error", description: "Failed to fetch bids in real-time.", variant: "destructive" });
    });

    return () => unsubscribeBids();
  }, [shipmentId, shipment?.status, toast]);
  
  useEffect(() => {
    if (!shipmentId || userType !== 'employee') {
        const registerQuery = query(collection(db, "shipments", shipmentId, "register"));
        const unsubscribeRegister = onSnapshot(registerQuery, (querySnapshot) => {
             setRegisteredCarriers(querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as RegisteredCarrier)));
        });
        return () => unsubscribeRegister();
    }
    
    // For employees, fetch the names as well
    const registerQuery = query(collection(db, "shipments", shipmentId, "register"));
    const unsubscribeRegister = onSnapshot(registerQuery, async (querySnapshot) => {
      const carrierPromises = querySnapshot.docs.map(async (regDoc) => {
        const carrierId = regDoc.id;
        const registrationData = regDoc.data();
        
        const userDocRef = doc(db, 'users', carrierId);
        const userDoc = await getDoc(userDocRef);

        return {
            id: carrierId,
            legalName: userDoc.exists() ? userDoc.data().companyDetails?.legalName : "Unknown Carrier",
            registeredAt: registrationData.registeredAt
        };
      });
      const carriers = await Promise.all(carrierPromises);
      setRegisteredCarriers(carriers as RegisteredCarrier[]);
    }, (error) => {
        console.error("Error fetching registration list: ", error);
    });

    return () => unsubscribeRegister();
  }, [shipmentId, userType]);

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

  const handleGoLive = async () => {
    if (!shipmentId) return;
    setIsSubmitting(true);
    try {
      const shipmentDocRef = doc(db, "shipments", shipmentId);
      await updateDoc(shipmentDocRef, { 
        status: 'live',
        goLiveAt: Timestamp.now() // Set go-live time to now
      });
      toast({ title: "Success!", description: "The shipment is now live for bidding." });
    } catch (error) {
      console.error("Error setting shipment to live: ", error);
      toast({ title: "Error", description: "Could not set the shipment to live.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDeleteShipment = async () => {
    if (!shipmentId) return;
    setIsSubmitting(true);
    try {
      const shipmentDocRef = doc(db, "shipments", shipmentId);
      await deleteDoc(shipmentDocRef);
      toast({ title: "Success", description: "Shipment has been deleted." });
      router.push('/dashboard/exporter');
    } catch (error) {
      console.error("Error deleting shipment: ", error);
      toast({ title: "Error", description: "Could not delete the shipment.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
    }
  }

  const handleBackNavigation = () => {
    if (userType === 'exporter') {
      router.push('/dashboard/exporter');
    } else if (userType === 'employee') {
      router.push('/dashboard/manage-shipments');
    } else {
      router.back();
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

  const isOwner = user?.uid === shipment.exporterId;
  const isEmployee = userType === 'employee';
  const isWinningCarrier = user?.uid === shipment.winningCarrierId;
  
  const canEdit = isOwner && (shipment.status === 'draft' || shipment.status === 'scheduled');
  const canDelete = isOwner && shipment.status === 'draft';
  const canAcceptBid = (isOwner || isEmployee) && shipment.status === 'live';
  const canGoLive = isEmployee && shipment.status === 'scheduled';
  const canViewDocuments = (isOwner || isEmployee || isWinningCarrier) && shipment.status === 'awarded';

  return (
    <div className="container py-6 md:py-10">
        <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" onClick={handleBackNavigation}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
            <div className="flex items-center gap-2">
              {canDelete && (
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this
                        shipment and remove its data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteShipment} disabled={isSubmitting}>
                        {isSubmitting ? "Deleting..." : "Yes, delete it"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {canEdit && (
                  <Button variant="outline" onClick={() => router.push(`/dashboard/exporter?edit=${shipmentId}`)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Shipment
                  </Button>
              )}
               {canViewDocuments && (
                 <Button onClick={() => router.push(`/dashboard/shipment/${shipmentId}/documents`)}>
                    <FileText className="mr-2 h-4 w-4" />
                    View Documents
                 </Button>
               )}
              {isEmployee && !canEdit && (
                  <Badge variant="outline" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Employee View
                  </Badge>
              )}
            </div>
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
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => handleAcceptBid(bid)} 
                                                            disabled={isSubmitting || !canAcceptBid}
                                                            className={cn({
                                                                'hover:bg-green-600 hover:text-white': canAcceptBid
                                                            })}
                                                        >
                                                            Accept Bid
                                                        </Button>
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
                        {canGoLive && (
                            <Button onClick={handleGoLive} disabled={isSubmitting} className="w-full mt-4">
                                <Rocket className="mr-2 h-4 w-4" /> Go Live
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {shipment.status === 'scheduled' && (
                    <Card className="bg-white dark:bg-card">
                        <CardHeader>
                            <CardTitle>Interest</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <div className="flex items-center justify-between">
                               <div className="flex items-center gap-4">
                                    <Users className="h-8 w-8 text-primary" />
                                    <div>
                                        <p className="text-2xl font-bold">{registeredCarriers.length}</p>
                                        <p className="text-sm text-muted-foreground">Carriers Registered</p>
                                    </div>
                               </div>
                               {isEmployee && registeredCarriers.length > 0 && (
                                   <Dialog>
                                       <DialogTrigger asChild>
                                           <Button variant="outline">View List</Button>
                                       </DialogTrigger>
                                       <DialogContent className="sm:max-w-2xl">
                                            <DialogHeader>
                                                <DialogTitle>Registered Carriers</DialogTitle>
                                                <DialogDescription>
                                                    The following carriers have registered to bid on this shipment.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="max-h-[60vh] overflow-y-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Carrier Legal Name</TableHead>
                                                            <TableHead>Registered At</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {registeredCarriers.map((carrier) => (
                                                            <TableRow key={carrier.id}>
                                                                <TableCell>{carrier.legalName || 'N/A'}</TableCell>
                                                                <TableCell>{format(carrier.registeredAt.toDate(), "PPpp")}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                       </DialogContent>
                                   </Dialog>
                               )}
                           </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    </div>
  );
}

    