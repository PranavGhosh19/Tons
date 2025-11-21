

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, collection, query, orderBy, onSnapshot, DocumentData, Timestamp, updateDoc, deleteDoc, where, getDocs, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Clock, Shield, Users, Rocket, Pencil, Trash2, FileText, Send, Search, Award, Star, Loader2 } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type RegisteredCarrier = {
    id: string;
    legalName?: string;
    registeredAt: Timestamp;
};

type AllCarriers = {
  id: string;
  name: string;
  email: string;
}

export default function ShipmentDetailPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [shipment, setShipment] = useState<DocumentData | null>(null);
  const [bids, setBids] = useState<DocumentData[]>([]);
  const [registeredCarriers, setRegisteredCarriers] = useState<RegisteredCarrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMarkedAsDelivered, setIsMarkedAsDelivered] = useState(false);

  // Feedback state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [feedbackData, setFeedbackData] = useState<DocumentData | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  
  // Carrier Invite State
  const [allCarriers, setAllCarriers] = useState<AllCarriers[]>([]);
  const [carrierSearchTerm, setCarrierSearchTerm] = useState("");
  const [loadingCarriers, setLoadingCarriers] = useState(false);
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);


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
        if (shipmentData.status === 'delivered') {
          setIsMarkedAsDelivered(true);
        }

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
    
    // Listen for feedback
    const feedbackQuery = query(collection(db, "shipments", shipmentId, "feedback"));
    const unsubscribeFeedback = onSnapshot(feedbackQuery, (querySnapshot) => {
      if (!querySnapshot.empty) {
        // For this app, we'll just show the first feedback document found.
        const feedbackDoc = querySnapshot.docs[0];
        setFeedbackData(feedbackDoc.data());
      } else {
        setFeedbackData(null);
      }
    });

    return () => {
      unsubscribeShipment();
      unsubscribeFeedback();
    };

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
  
  const fetchAllCarriers = useCallback(async () => {
    setLoadingCarriers(true);
    const carriersQuery = query(
      collection(db, 'users'), 
      where('userType', '==', 'carrier'),
      where('verificationStatus', '==', 'approved')
    );
    
    getDocs(carriersQuery)
      .then(querySnapshot => {
        const carriersList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || 'Unnamed Carrier',
            email: doc.data().email
        }));
        setAllCarriers(carriersList);
      })
      .catch(serverError => {
        const permissionError = new FirestorePermissionError({
          path: '/users', // This might be a simplification depending on the actual query
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setLoadingCarriers(false);
      });
  }, []);


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

  const handleCarrierSelection = (carrierId: string) => {
    setSelectedCarriers(prev => 
      prev.includes(carrierId) 
        ? prev.filter(id => id !== carrierId)
        : [...prev, carrierId]
    );
  };
  
  const handleInvite = () => {
    // Placeholder for actual invite logic
    console.log("Inviting carriers:", selectedCarriers);
    toast({
        title: "Invitations Sent (Simulated)",
        description: `Successfully sent invitations to ${selectedCarriers.length} carriers.`
    });
    setSelectedCarriers([]);
    setIsInviteDialogOpen(false);
  }

  const handleMarkAsDelivered = async () => {
    if (!shipmentId) return;
    setIsSubmitting(true);
    const shipmentDocRef = doc(db, "shipments", shipmentId);
    const payload = { status: 'delivered' };
    
    updateDoc(shipmentDocRef, payload)
        .then(() => {
            toast({ title: "Success!", description: "The shipment has been marked as delivered." });
            setIsMarkedAsDelivered(true);
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: shipmentDocRef.path,
                operation: 'update',
                requestResourceData: payload,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsSubmitting(false);
        });
    }
  
  const handleFeedbackSubmit = async () => {
    if (rating === 0) {
        toast({ title: "Please provide a rating", variant: "destructive" });
        return;
    }
    if (!user || !shipmentId) return;

    setIsSubmittingFeedback(true);
    const feedbackDocRef = doc(db, "shipments", shipmentId, "feedback", user.uid);
    const payload = {
      rating,
      feedback,
      submittedAt: Timestamp.now(),
      authorId: user.uid,
      authorType: userType
    };

    setDoc(feedbackDocRef, payload)
      .then(() => {
        toast({ title: "Feedback Submitted!", description: "Thank you for your valuable feedback." });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: feedbackDocRef.path,
            operation: 'create',
            requestResourceData: payload,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmittingFeedback(false);
      });
  };

  const isOwner = user?.uid === shipment?.exporterId;
  const isEmployee = userType === 'employee';
  const isWinningCarrier = user?.uid === shipment?.winningCarrierId;
  
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
  
  const canEdit = isOwner && (shipment.status === 'draft' || shipment.status === 'scheduled');
  const canDelete = isOwner && shipment.status === 'draft';
  const canAcceptBid = (isOwner && shipment.status === 'live') || (isEmployee && shipment.status === 'live');
  const canGoLive = isEmployee && shipment.status === 'scheduled';
  const canViewDocuments = (isOwner || isEmployee || isWinningCarrier) && shipment.status === 'awarded';
  const canInvite = (isOwner || isEmployee) && shipment.status === 'scheduled';
  const canMarkAsDelivered = isOwner && shipment.status === 'awarded';
  const canViewFeedbackCard = isMarkedAsDelivered && (isOwner || isEmployee || isWinningCarrier);
  const canSubmitFeedback = (isOwner || isEmployee) && !feedbackData;

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
             if (isOwner) {
                return { text: "Congratulations! You have Awarded", description: `to ${shipment.winningCarrierName || 'a carrier'}.` };
            }
            return { text: "Awarded", description: `Awarded to ${shipment.winningCarrierName || 'a carrier'}.` };
        case 'delivered':
            return { text: "Delivered", description: "This shipment has been successfully delivered." };
        default:
            return { text: "Status Unknown", description: "" };
    }
  }

  const statusInfo = getStatusInfo();
  
  const hasDimensions = shipment.cargo?.dimensions?.length && shipment.cargo?.dimensions?.width && shipment.cargo?.dimensions?.height;

  const filteredCarriers = allCarriers.filter(c => c.name.toLowerCase().includes(carrierSearchTerm.toLowerCase()));

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
                             {shipment.hsnCode && <div><span className="font-semibold text-muted-foreground block mb-1">HSN / ITC-HS Code</span>{shipment.hsnCode}</div>}
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
                {shipment.status === 'delivered' ? (
                    <Card className="bg-gray-800 text-white dark:bg-gray-900">
                        <CardHeader>
                            <CardTitle>Shipment Status</CardTitle>
                            <CardDescription className="text-gray-400">{statusInfo.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-center p-4 bg-gray-700 dark:bg-gray-800 rounded-lg">
                                <Check className="text-yellow-400 h-6 w-6 mr-3" />
                                <p className="text-2xl font-bold font-headline text-white capitalize">
                                    {statusInfo.text}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="bg-white dark:bg-card">
                        <CardHeader>
                            <CardTitle>Shipment Status</CardTitle>
                            <CardDescription>{statusInfo.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isOwner && shipment.status === 'awarded' ? (
                                <div className="flex flex-col items-center justify-center p-4 bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Award className="h-6 w-6" />
                                        <p className="text-lg font-semibold">{statusInfo.text}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-2xl font-bold font-headline text-accent-foreground capitalize">{statusInfo.text}</p>
                            )}
                        
                            {canGoLive && (
                                <Button onClick={handleGoLive} disabled={isSubmitting} className="w-full mt-4">
                                    <Rocket className="mr-2 h-4 w-4" /> Go Live
                                </Button>
                            )}
                            {canViewDocuments && (
                                <Button onClick={() => router.push(`/dashboard/shipment/${shipmentId}/documents`)} className="w-full mt-4">
                                <FileText className="mr-2 h-4 w-4" />
                                View Documents
                                </Button>
                            )}
                             {canMarkAsDelivered && (
                                <Button 
                                    className="w-full mt-4"
                                    onClick={handleMarkAsDelivered}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                    Mark as Delivered
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}
                
                {canViewFeedbackCard && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Rating and Feedback</CardTitle>
                            <CardDescription>
                                {canSubmitFeedback
                                    ? `Rate your experience with ${shipment.winningCarrierName}.`
                                    : 'Feedback has been submitted for this shipment.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-center gap-1" onMouseLeave={() => canSubmitFeedback && setHoverRating(0)}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button 
                                        key={star} 
                                        onClick={() => canSubmitFeedback && setRating(star)}
                                        onMouseEnter={() => canSubmitFeedback && setHoverRating(star)}
                                        className="focus:outline-none disabled:cursor-not-allowed"
                                        disabled={!canSubmitFeedback}
                                    >
                                        <Star
                                            className={cn("h-8 w-8 transition-colors",
                                                star <= (hoverRating || rating || (feedbackData?.rating || 0))
                                                ? "text-yellow-400 fill-yellow-400"
                                                : "text-muted-foreground/50",
                                                canSubmitFeedback ? "cursor-pointer" : "cursor-not-allowed"
                                            )}
                                        />
                                    </button>
                                ))}
                            </div>
                            <Textarea 
                                placeholder="Share your feedback about the carrier..."
                                value={feedbackData?.feedback || feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                disabled={isSubmittingFeedback || !canSubmitFeedback}
                                readOnly={!!feedbackData}
                            />
                            {canSubmitFeedback && (
                                <Button 
                                    onClick={handleFeedbackSubmit} 
                                    disabled={isSubmittingFeedback}
                                    className="w-full"
                                >
                                    {isSubmittingFeedback && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}

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
                           {canInvite && (
                                <Dialog open={isInviteDialogOpen} onOpenChange={(open) => {
                                    if (open) {
                                        fetchAllCarriers();
                                    }
                                    setIsInviteDialogOpen(open);
                                }}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full mt-4">
                                            <Send className="mr-2 h-4 w-4" /> Invite Carriers
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Invite Carriers</DialogTitle>
                                            <DialogDescription>Select carriers to invite to this shipment.</DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4 space-y-4">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input 
                                                    placeholder="Search by name..."
                                                    value={carrierSearchTerm}
                                                    onChange={(e) => setCarrierSearchTerm(e.target.value)}
                                                    className="pl-10"
                                                />
                                            </div>
                                            <ScrollArea className="h-72">
                                                {loadingCarriers ? (
                                                    <div className="space-y-2 p-4">
                                                        <Skeleton className="h-12 w-full" />
                                                        <Skeleton className="h-12 w-full" />
                                                        <Skeleton className="h-12 w-full" />
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        {filteredCarriers.map(carrier => (
                                                            <div key={carrier.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-secondary">
                                                                <Checkbox 
                                                                    id={`carrier-${carrier.id}`}
                                                                    onCheckedChange={() => handleCarrierSelection(carrier.id)}
                                                                    checked={selectedCarriers.includes(carrier.id)}
                                                                />
                                                                <Label htmlFor={`carrier-${carrier.id}`} className="flex items-center gap-3 cursor-pointer w-full">
                                                                    <Avatar>
                                                                        <AvatarFallback>{carrier.name.charAt(0).toUpperCase()}</AvatarFallback>
                                                                    </Avatar>
                                                                    <p className="font-semibold">{carrier.name}</p>
                                                                </Label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </ScrollArea>
                                        </div>
                                         <DialogFooter>
                                            <Button 
                                                onClick={handleInvite} 
                                                disabled={selectedCarriers.length === 0}
                                                className="w-full"
                                            >
                                                Invite {selectedCarriers.length > 0 ? selectedCarriers.length : ''} Carrier(s)
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    </div>
  );
}
