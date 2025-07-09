
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, query, getDocs, DocumentData, Timestamp, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Calendar as CalendarIcon, Send, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PageSkeleton = () => (
    <div className="container py-10">
        <div className="flex justify-between items-center mb-8">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-64 w-full" />
    </div>
);

export default function ExporterDashboardPageWrapper() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ExporterDashboardPage />
    </Suspense>
  );
}

function ExporterDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null);
  
  // Form state
  const [productName, setProductName] = useState("");
  const [cargoType, setCargoType] = useState("");
  const [weight, setWeight] = useState("");
  const [dimensionL, setDimensionL] = useState("");
  const [dimensionW, setDimensionW] = useState("");
  const [dimensionH, setDimensionH] = useState("");
  const [departureDate, setDepartureDate] = useState<Date>();
  const [deliveryDeadline, setDeliveryDeadline] = useState<Date>();
  const [portOfLoading, setPortOfLoading] = useState("");
  const [originZip, setOriginZip] = useState("");
  const [portOfDelivery, setPortOfDelivery] = useState("");
  const [destinationZip, setDestinationZip] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingGoLive, setIsSubmittingGoLive] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data()?.userType === 'exporter') {
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
  
  const fetchProducts = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const shipmentsCollectionRef = collection(db, 'shipments');
      const q = query(shipmentsCollectionRef, where('exporterId', '==', uid));
      const querySnapshot = await getDocs(q);
      const productsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      productsList.sort((a, b) => {
        const timeA = a.createdAt?.toDate().getTime() || 0;
        const timeB = b.createdAt?.toDate().getTime() || 0;
        return timeB - timeA;
      });

      setProducts(productsList);
    } catch (error) {
      console.error("Error fetching products: ", error);
      toast({ title: "Error", description: "Could not fetch products.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      fetchProducts(user.uid);
    }
  }, [user, fetchProducts]);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && user) {
        const fetchAndSetShipment = async () => {
            try {
                const shipmentDocRef = doc(db, 'shipments', editId);
                const docSnap = await getDoc(shipmentDocRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.exporterId !== user.uid) {
                         toast({ title: "Error", description: "You are not authorized to edit this shipment.", variant: "destructive" });
                         router.push('/dashboard/exporter');
                         return;
                    }

                    setProductName(data.productName || "");
                    setCargoType(data.cargo?.type || "");
                    setWeight(data.cargo?.weight || "");
                    setDimensionL(data.cargo?.dimensions?.length || "");
                    setDimensionW(data.cargo?.dimensions?.width || "");
                    setDimensionH(data.cargo?.dimensions?.height || "");
                    setDepartureDate(data.departureDate?.toDate());
                    setDeliveryDeadline(data.deliveryDeadline?.toDate());
                    setPortOfLoading(data.origin?.portOfLoading || "");
                    setOriginZip(data.origin?.zipCode || "");
                    setPortOfDelivery(data.destination?.portOfDelivery || "");
                    setDestinationZip(data.destination?.zipCode || "");
                    setSpecialInstructions(data.specialInstructions || "");
                    
                    setEditingShipmentId(editId);
                    setOpen(true);
                } else {
                    toast({ title: "Error", description: "Shipment to edit not found.", variant: "destructive" });
                    router.push('/dashboard/exporter');
                }
            } catch (error) {
                console.error("Error fetching shipment for edit: ", error);
                toast({ title: "Error", description: "Failed to load shipment for editing.", variant: "destructive" });
                router.push('/dashboard/exporter');
            }
        };
        fetchAndSetShipment();
    }
  }, [searchParams, user, router, toast]);

  useEffect(() => {
    if (departureDate && deliveryDeadline && departureDate > deliveryDeadline) {
      setDeliveryDeadline(undefined);
      toast({
        title: "Info",
        description: "Delivery deadline was cleared as it cannot be before the departure date.",
      });
    }
  }, [departureDate, deliveryDeadline, toast]);

  const resetForm = () => {
    setProductName("");
    setCargoType("");
    setWeight("");
    setDimensionL("");
    setDimensionW("");
    setDimensionH("");
    setDepartureDate(undefined);
    setDeliveryDeadline(undefined);
    setPortOfLoading("");
    setOriginZip("");
    setPortOfDelivery("");
    setDestinationZip("");
    setSpecialInstructions("");
    setEditingShipmentId(null);
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
        resetForm();
        router.push('/dashboard/exporter', { scroll: false });
    }
  }

  const handleSubmit = async () => {
    if (!productName || !portOfLoading || !originZip || !portOfDelivery || !destinationZip || !departureDate || !deliveryDeadline) {
      toast({ title: "Error", description: "Please fill out all required fields.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create a shipment.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    const shipmentPayload = {
      productName,
      cargo: {
        type: cargoType,
        weight,
        dimensions: {
          length: dimensionL,
          width: dimensionW,
          height: dimensionH,
        },
      },
      departureDate: departureDate ? Timestamp.fromDate(departureDate) : null,
      deliveryDeadline: deliveryDeadline ? Timestamp.fromDate(deliveryDeadline) : null,
      origin: {
          portOfLoading,
          zipCode: originZip,
      },
      destination: {
          portOfDelivery,
          zipCode: destinationZip,
      },
      specialInstructions,
    };
    
    try {
      if (editingShipmentId) {
        const shipmentDocRef = doc(db, "shipments", editingShipmentId);
        await updateDoc(shipmentDocRef, shipmentPayload);
        toast({ title: "Success", description: "Shipment updated." });
      } else {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const exporterName = userDoc.exists() ? userDoc.data().name : 'Unknown Exporter';
        
        await addDoc(collection(db, 'shipments'), {
          ...shipmentPayload,
          exporterId: user.uid,
          exporterName: exporterName,
          status: 'draft',
          createdAt: Timestamp.now(),
        });
        toast({ title: "Success", description: "Shipment request created as a draft." });
      }
      resetForm();
      setOpen(false);
      router.push('/dashboard/exporter', { scroll: false });
      await fetchProducts(user.uid);
    } catch (error) {
      console.error("Error submitting document: ", error);
      toast({ title: "Error", description: "Failed to save shipment.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoLive = async (shipmentId: string) => {
    if (!user) return;
    setIsSubmittingGoLive(shipmentId);
    try {
        const shipmentDocRef = doc(db, "shipments", shipmentId);
        await updateDoc(shipmentDocRef, { status: 'live' });
        toast({ title: "Success!", description: "Your shipment is now live for bidding."});
        await fetchProducts(user.uid);
    } catch (error) {
        console.error("Error going live: ", error);
        toast({ title: "Error", description: "Could not make the shipment live.", variant: "destructive" });
    } finally {
        setIsSubmittingGoLive(null);
    }
  };


  if (loading || !user) {
    return <PageSkeleton />;
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'live':
        return 'default';
      case 'awarded':
        return 'success';
      case 'draft':
        return 'secondary';
      default:
        return 'outline';
    }
  }


  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold font-headline">My Shipments</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> New Shipment Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline">{editingShipmentId ? 'Edit Shipment' : 'New Shipment'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-8 py-4">
              <Card className="bg-secondary">
                <CardHeader><CardTitle>Product & Cargo Details</CardTitle></CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="product-name">Product Name</Label>
                    <Input id="product-name" placeholder="e.g., Electronics, Textiles" value={productName} onChange={e => setProductName(e.target.value)} disabled={isSubmitting} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cargo-type">Cargo Type</Label>
                    <Select value={cargoType} onValueChange={setCargoType} disabled={isSubmitting}>
                      <SelectTrigger id="cargo-type">
                        <SelectValue placeholder="Select a cargo type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General Cargo">General Cargo</SelectItem>
                        <SelectItem value="Container (FCL/LCL)">Container (FCL/LCL)</SelectItem>
                        <SelectItem value="Bulk (Dry)">Bulk (Dry)</SelectItem>
                        <SelectItem value="Bulk (Liquid)">Bulk (Liquid)</SelectItem>
                        <SelectItem value="Reefer / Temperature-Controlled">Reefer / Temperature-Controlled</SelectItem>
                        <SelectItem value="HAZMAT / Dangerous">HAZMAT / Dangerous</SelectItem>
                        <SelectItem value="Roll-on/Roll-off (RoRo)">Roll-on/Roll-off (RoRo)</SelectItem>
                        <SelectItem value="Break Bulk">Break Bulk</SelectItem>
                        <SelectItem value="Oversized / Out-of-Gauge">Oversized / Out-of-Gauge</SelectItem>
                        <SelectItem value="Project Cargo">Project Cargo</SelectItem>
                        <SelectItem value="Perishable Goods">Perishable Goods</SelectItem>
                        <SelectItem value="Live Animals">Live Animals</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="weight">Total Weight</Label>
                    <div className="flex items-center">
                        <Input id="weight" type="number" placeholder="e.g., 1200" value={weight} onChange={e => setWeight(e.target.value)} disabled={isSubmitting} className="rounded-r-none" />
                        <span className="bg-muted text-muted-foreground px-3 py-2 border border-l-0 rounded-r-md">kg</span>
                    </div>
                  </div>
                   <div className="grid gap-2 md:col-span-2">
                    <Label>Dimensions</Label>
                    <div className="grid grid-cols-3 gap-2">
                        <Input placeholder="Length" value={dimensionL} onChange={e => setDimensionL(e.target.value)} disabled={isSubmitting} />
                        <Input placeholder="Width" value={dimensionW} onChange={e => setDimensionW(e.target.value)} disabled={isSubmitting} />
                        <Input placeholder="Height" value={dimensionH} onChange={e => setDimensionH(e.target.value)} disabled={isSubmitting} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-secondary">
                  <CardHeader><CardTitle>Scheduling</CardTitle></CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="departure-date">Preferred Departure Date</Label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className={cn("justify-start text-left font-normal", !departureDate && "text-muted-foreground")}
                            disabled={isSubmitting}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {departureDate ? format(departureDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={departureDate} onSelect={setDepartureDate} initialFocus />
                        </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="delivery-deadline">Delivery Deadline</Label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className={cn("justify-start text-left font-normal", !deliveryDeadline && "text-muted-foreground")}
                            disabled={isSubmitting || !departureDate}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {deliveryDeadline ? format(deliveryDeadline, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={deliveryDeadline}
                                onSelect={setDeliveryDeadline}
                                disabled={departureDate ? { before: departureDate } : undefined}
                                initialFocus
                            />
                        </PopoverContent>
                        </Popover>
                    </div>
                  </CardContent>
              </Card>
              
              <div className="grid md:grid-cols-2 gap-6">
                  <Card className="bg-secondary">
                      <CardHeader><CardTitle>Origin</CardTitle></CardHeader>
                      <CardContent className="grid gap-6">
                          <div className="grid gap-2">
                              <Label htmlFor="port-of-loading">Port of Loading</Label>
                              <Input id="port-of-loading" placeholder="e.g., Port of Hamburg" value={portOfLoading} onChange={e => setPortOfLoading(e.target.value)} disabled={isSubmitting} />
                          </div>
                          <div className="grid gap-2">
                              <Label htmlFor="origin-zip">Pin / Zip Code</Label>
                              <Input id="origin-zip" placeholder="e.g., 20457" value={originZip} onChange={e => setOriginZip(e.target.value)} disabled={isSubmitting} />
                          </div>
                      </CardContent>
                  </Card>
                  <Card className="bg-secondary">
                      <CardHeader><CardTitle>Destination</CardTitle></CardHeader>
                      <CardContent className="grid gap-6">
                          <div className="grid gap-2">
                              <Label htmlFor="port-of-delivery">Port of Delivery</Label>
                              <Input id="port-of-delivery" placeholder="e.g., Port of Shanghai" value={portOfDelivery} onChange={e => setPortOfDelivery(e.target.value)} disabled={isSubmitting} />
                          </div>
                          <div className="grid gap-2">
                              <Label htmlFor="destination-zip">Pin / Zip Code</Label>
                              <Input id="destination-zip" placeholder="e.g., 200000" value={destinationZip} onChange={e => setDestinationZip(e.target.value)} disabled={isSubmitting} />
                          </div>
                      </CardContent>
                  </Card>
              </div>
            
              <Card className="bg-secondary">
                  <CardHeader><CardTitle>Additional Information</CardTitle></CardHeader>
                  <CardContent>
                      <div className="grid gap-2">
                          <Label htmlFor="special-instructions">Special Instructions</Label>
                          <Textarea id="special-instructions" placeholder="e.g., Handle with care, keep refrigerated below 5°C." value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} disabled={isSubmitting} />
                      </div>
                  </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
                {editingShipmentId ? <Pencil className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                {isSubmitting ? 'Saving...' : (editingShipmentId ? 'Save Changes' : 'Submit Request')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {products.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Departure Date</TableHead>
                <TableHead>Delivery Deadline</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} onClick={() => router.push(`/dashboard/shipment/${product.id}`)} className="cursor-pointer">
                  <TableCell className="font-medium">{product.productName || 'N/A'}</TableCell>
                  <TableCell>{product.destination?.portOfDelivery || 'N/A'}</TableCell>
                  <TableCell>{product.departureDate ? format(product.departureDate.toDate(), "PPP") : 'N/A'}</TableCell>
                  <TableCell>{product.deliveryDeadline ? format(product.deliveryDeadline.toDate(), "PPP") : 'N/A'}</TableCell>
                  <TableCell className="text-center">
                    {product.status === 'draft' ? (
                       <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleGoLive(product.id);
                        }}
                        disabled={isSubmittingGoLive === product.id}
                      >
                        {isSubmittingGoLive === product.id ? '...' : 'Go Live'}
                      </Button>
                    ) : (
                      <Badge variant={getStatusVariant(product.status)} className="capitalize">
                        {product.status}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center bg-card">
          <h2 className="text-xl font-semibold mb-2">No shipment requests yet</h2>
          <p className="text-muted-foreground">Click "New Shipment Request" to get started.</p>
        </div>
      )}
    </div>
  );
}
