
"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, query, getDocs, DocumentData, Timestamp, where, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Send, Pencil, Clock, ShieldAlert } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/datetime-picker";

const PageSkeleton = () => (
    <div className="container py-6 md:py-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-64 w-full" />
    </div>
);

const airCargoTypes = [
  { value: "General Cargo", label: "General Cargo" },
  { value: "Perishable Goods", label: "Perishable Goods" },
  { value: "Live Animals", label: "Live Animals" },
  { value: "HAZMAT / Dangerous", label: "HAZMAT / Dangerous" },
];

const lclCargoTypes = [
  { value: "General Cargo", label: "General Cargo" },
  { value: "HAZMAT / Dangerous", label: "HAZMAT / Dangerous" },
];

const otherCargoTypes = [
  { value: "General Cargo", label: "General Cargo" },
  { value: "Bulk (Dry)", label: "Bulk (Dry)" },
  { value: "Bulk (Liquid)", label: "Bulk (Liquid)" },
  { value: "Reefer / Temperature-Controlled", label: "Reefer / Temperature-Controlled" },
  { value: "HAZMAT / Dangerous", label: "HAZMAT / Dangerous" },
  { value: "Roll-on/Roll-off (RoRo)", label: "Roll-on/Roll-off (RoRo)" },
  { value: "Oversized / Out-of-Gauge", label: "Oversized / Out-of-Gauge" },
  { value: "Project Cargo", label: "Project Cargo" },
  { value: "Perishable Goods", label: "Perishable Goods" },
  { value: "Live Animals", label: "Live Animals" },
];

const packageTypes = [
    { value: "PALLET", label: "PALLET" },
    { value: "PALLETS", label: "PALLETS" },
    { value: "BOX", label: "BOX" },
    { value: "BOXES", label: "BOXES" },
    { value: "UNIT", label: "UNIT" },
    { value: "UNITS", label: "UNITS" },
    { value: "CASE", label: "CASE" },
    { value: "CASES", label: "CASES" },
    { value: "INTERMEDIATE BULK CONTAINERS", label: "INTERMEDIATE BULK CONTAINERS" },
    { value: "BALES", label: "BALES" },
    { value: "PACKET", label: "PACKET" },
    { value: "PACKETS", label: "PACKETS" },
];


export default function ExporterDashboardPageWrapper() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ExporterDashboardPage />
    </Suspense>
  );
}

function ExporterDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<DocumentData | null>(null);
  const [products, setProducts] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null);
  
  // Form state
  const [shipmentType, setShipmentType] = useState("");
  const [productName, setProductName] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [modeOfShipment, setModeOfShipment] = useState("");
  const [cargoType, setCargoType] = useState("");
  const [packageType, setPackageType] = useState("");
  const [weight, setWeight] = useState("");
  const [dimensionL, setDimensionL] = useState("");
  const [dimensionW, setDimensionW] = useState("");
  const [dimensionH, setDimensionH] = useState("");
  const [dimensionUnit, setDimensionUnit] = useState("CMS");
  const [departureDate, setDepartureDate] = useState<Date>();
  const [deliveryDeadline, setDeliveryDeadline] = useState<Date>();
  const [portOfLoading, setPortOfLoading] = useState("");
  const [originZip, setOriginZip] = useState("");
  const [portOfDelivery, setPortOfDelivery] = useState("");
  const [destinationZip, setDestinationZip] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [goLiveDate, setGoLiveDate] = useState<Date | undefined>();

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const cargoTypeOptions = useMemo(() => {
    if (modeOfShipment === 'Air') {
        return airCargoTypes;
    }
    if (modeOfShipment === 'Less than Container Load') {
        return lclCargoTypes;
    }
    return otherCargoTypes;
  }, [modeOfShipment]);

  const showDimensions = useMemo(() => {
    if (modeOfShipment === 'Air') {
      const validCargoTypes = ['General Cargo', 'HAZMAT / Dangerous', 'Perishable Goods'];
      return validCargoTypes.includes(cargoType);
    }
    if (modeOfShipment === 'Less than Container Load') {
      const validCargoTypes = ['General Cargo', 'HAZMAT / Dangerous'];
      return validCargoTypes.includes(cargoType);
    }
    return false;
  }, [modeOfShipment, cargoType]);

  useEffect(() => {
    // Reset cargo type if it's not in the current options
    if (cargoType && !cargoTypeOptions.find(opt => opt.value === cargoType)) {
        setCargoType("");
    }
  }, [cargoType, cargoTypeOptions]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const uData = userDoc.data();
          if (uData.userType === 'exporter') {
            setUser(currentUser);
            setUserData(uData);
          } else {
             router.push('/dashboard');
          }
        } else {
           router.push('/login');
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
      if (userData?.verificationStatus === 'approved') {
        fetchProducts(user.uid);
      } else {
        setLoading(false);
      }
    }
  }, [user, userData, fetchProducts]);

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

                    setShipmentType(data.shipmentType || "");
                    setProductName(data.productName || "");
                    setHsnCode(data.hsnCode || "");
                    setModeOfShipment(data.modeOfShipment || "");
                    setCargoType(data.cargo?.type || "");
                    setPackageType(data.cargo?.packageType || "");
                    setWeight(data.cargo?.weight || "");
                    setDimensionL(data.cargo?.dimensions?.length || "");
                    setDimensionW(data.cargo?.dimensions?.width || "");
                    setDimensionH(data.cargo?.dimensions?.height || "");
                    setDimensionUnit(data.cargo?.dimensions?.unit || "CMS");
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
    setShipmentType("");
    setProductName("");
    setHsnCode("");
    setModeOfShipment("");
    setCargoType("");
    setPackageType("");
    setWeight("");
    setDimensionL("");
    setDimensionW("");
    setDimensionH("");
    setDimensionUnit("CMS");
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

  const handleValidation = () => {
    if (!productName || !portOfLoading || !originZip || !portOfDelivery || !destinationZip || !departureDate || !deliveryDeadline) {
      toast({ title: "Error", description: "Please fill out all required fields.", variant: "destructive" });
      return false;
    }
    if (hsnCode && hsnCode.length < 4) {
      toast({ title: "Invalid HSN Code", description: "HSN Code must be at least 4 digits.", variant: "destructive" });
      return false;
    }
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create a shipment.", variant: "destructive" });
      return false;
    }
    return true;
  }
  
  const handleOpenScheduleDialog = () => {
    if (handleValidation()) {
        setIsScheduleDialogOpen(true);
    }
  }

  const handleSubmit = async (status: 'draft' | 'scheduled' = 'draft', goLiveTimestamp?: Timestamp | null) => {
    if (!handleValidation()) return;

    setIsSubmitting(true);
    
    const shipmentPayload: any = {
      shipmentType,
      productName,
      hsnCode,
      modeOfShipment,
      cargo: {
        type: cargoType,
        packageType: packageType,
        weight,
        dimensions: {
          length: dimensionL,
          width: dimensionW,
          height: dimensionH,
          unit: dimensionUnit,
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
      status: status,
      ...(goLiveTimestamp && { goLiveAt: goLiveTimestamp })
    };
    
    try {
      if (editingShipmentId) {
        const shipmentDocRef = doc(db, "shipments", editingShipmentId);
        await updateDoc(shipmentDocRef, shipmentPayload);
        toast({ title: "Success", description: "Shipment updated." });
      } else {
        const userDocRef = doc(db, 'users', user!.uid);
        const userDoc = await getDoc(userDocRef);
        const exporterName = userDoc.exists() ? userDoc.data().companyDetails.legalName : 'Unknown Exporter';
        
        await addDoc(collection(db, 'shipments'), {
          ...shipmentPayload,
          exporterId: user!.uid,
          exporterName: exporterName,
          createdAt: Timestamp.now(),
        });
        const successMessage = status === 'draft' ? "Shipment request saved as draft." : "Shipment has been scheduled.";
        toast({ title: "Success", description: successMessage });
      }
      resetForm();
      setOpen(false);
      setIsScheduleDialogOpen(false);
      setGoLiveDate(undefined);
      router.push('/dashboard/exporter', { scroll: false });
      await fetchProducts(user!.uid);
    } catch (error) {
      console.error("Error submitting document: ", error);
      toast({ title: "Error", description: "Failed to save shipment.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSchedule = () => {
    if (goLiveDate) {
        const goLiveTimestamp = Timestamp.fromDate(goLiveDate);
        handleSubmit('scheduled', goLiveTimestamp);
    } else {
        toast({title: "Error", description: "Please select a date and time to go live.", variant: "destructive"})
    }
  }

  const VerificationStatus = () => {
    const status = userData?.verificationStatus;
    if (status === 'pending') {
        return (
            <Card className="bg-yellow-50 border-yellow-400">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><ShieldAlert className="text-yellow-600"/>Verification Pending</CardTitle>
                    <CardDescription>
                        Your business details are currently under review. You will be notified once the verification is complete. You can create and save draft shipments, but you cannot schedule them to go live yet.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }
    if (status === 'rejected') {
         return (
            <Card className="bg-red-50 border-red-400">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><ShieldAlert className="text-red-600"/>Verification Denied</CardTitle>
                    <CardDescription>
                       Your verification request was not approved. Please review your details in Settings and contact support if you believe this is an error.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }
    return null;
  }

  if (loading || !user) {
    return <PageSkeleton />;
  }

  const isApproved = userData?.verificationStatus === 'approved';

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
  }

  return (
    <div className="container py-6 md:py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">My Shipments</h1>
        {isApproved && (
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> New Shipment Request
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline">{editingShipmentId ? 'Edit Shipment' : 'New Shipment'}</DialogTitle>
                <DialogDescription>
                  Fill out the form below to create or update your shipment request.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <Card className="bg-secondary">
                  <CardHeader><CardTitle>Product & Cargo Details</CardTitle></CardHeader>
                  <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="grid gap-2 lg:col-span-3">
                      <Label htmlFor="shipment-type">Shipment</Label>
                      <Select value={shipmentType} onValueChange={setShipmentType} disabled={isSubmitting}>
                        <SelectTrigger id="shipment-type">
                          <SelectValue placeholder="Select shipment type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EXPORT">EXPORT</SelectItem>
                          <SelectItem value="IMPORT">IMPORT</SelectItem>
                          <SelectItem value="COASTAL MOVEMENT">COASTAL MOVEMENT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-name">Product Name</Label>
                      <Input id="product-name" placeholder="e.g., Electronics, Textiles" value={productName} onChange={e => setProductName(e.target.value)} disabled={isSubmitting} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="hsn-code">HSN Code</Label>
                      <Input id="hsn-code" placeholder="e.g., 85171290" value={hsnCode} onChange={e => setHsnCode(e.target.value)} disabled={isSubmitting} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="mode-of-shipment">Mode of Shipment</Label>
                      <Select value={modeOfShipment} onValueChange={setModeOfShipment} disabled={isSubmitting}>
                        <SelectTrigger id="mode-of-shipment">
                          <SelectValue placeholder="Select a mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Air">Air</SelectItem>
                          <SelectItem value="Full Container Load">Full Container Load</SelectItem>
                          <SelectItem value="Less than Container Load">Less than Container Load</SelectItem>
                          <SelectItem value="Break Bulk">Break Bulk</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="cargo-type">Cargo Type</Label>
                      <Select value={cargoType} onValueChange={setCargoType} disabled={isSubmitting || !modeOfShipment}>
                        <SelectTrigger id="cargo-type">
                          <SelectValue placeholder="Select a cargo type" />
                        </SelectTrigger>
                        <SelectContent>
                          {cargoTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="package-type">Package Type</Label>
                      <Select value={packageType} onValueChange={setPackageType} disabled={isSubmitting}>
                        <SelectTrigger id="package-type">
                          <SelectValue placeholder="Select a package type" />
                        </SelectTrigger>
                        <SelectContent>
                          {packageTypes.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
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
                    {showDimensions && (
                      <div className="grid gap-2 lg:col-span-3">
                        <Label>Dimensions (L x W x H)</Label>
                        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                            <Input placeholder="Length" value={dimensionL} onChange={e => setDimensionL(e.target.value)} disabled={isSubmitting} />
                            <Input placeholder="Width" value={dimensionW} onChange={e => setDimensionW(e.target.value)} disabled={isSubmitting} />
                            <Input placeholder="Height" value={dimensionH} onChange={e => setDimensionH(e.target.value)} disabled={isSubmitting} />
                            <Select value={dimensionUnit} onValueChange={setDimensionUnit} disabled={isSubmitting}>
                              <SelectTrigger>
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="CMS">CMS</SelectItem>
                                  <SelectItem value="FEET">FEET</SelectItem>
                                  <SelectItem value="MM">MM</SelectItem>
                                  <SelectItem value="METRE">METRE</SelectItem>
                              </SelectContent>
                            </Select>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-secondary">
                    <CardHeader><CardTitle>Scheduling</CardTitle></CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                      <div className="grid gap-2">
                          <Label>Preferred Departure Date</Label>
                          <DateTimePicker 
                              date={departureDate}
                              setDate={setDepartureDate}
                              disabled={isSubmitting}
                              disabledDates={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                          />
                      </div>
                      <div className="grid gap-2">
                          <Label>Delivery Deadline</Label>
                          <DateTimePicker 
                              date={deliveryDeadline}
                              setDate={setDeliveryDeadline}
                              disabled={isSubmitting || !departureDate}
                              disabledDates={(date) => departureDate ? date < departureDate : date < new Date(new Date().setHours(0,0,0,0))}
                          />
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
                <Button variant="outline" onClick={handleOpenScheduleDialog} disabled={isSubmitting} className="w-full sm:w-auto">
                    <Clock className="mr-2 h-4 w-4" />
                    Schedule
                </Button>
                <Button type="submit" onClick={() => handleSubmit('draft')} disabled={isSubmitting} className="w-full sm:w-auto">
                  {editingShipmentId ? <Pencil className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                  {isSubmitting ? 'Saving...' : (editingShipmentId ? 'Save Changes' : 'Submit as Draft')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      {!isApproved && <div className="mb-8"><VerificationStatus /></div>}
      
      <AlertDialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Schedule Go-Live Time</AlertDialogTitle>
            <AlertDialogDescription>
                Select the exact date and time you want this shipment to go live for bidding.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
                <DateTimePicker
                    date={goLiveDate}
                    setDate={setGoLiveDate}
                    disabledDates={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setGoLiveDate(undefined)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmSchedule} disabled={!goLiveDate || isSubmitting}>
                    {isSubmitting ? 'Scheduling...' : 'Confirm Schedule'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {products.length > 0 ? (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="hidden md:table-cell">Destination</TableHead>
                <TableHead className="hidden lg:table-cell">Departure Date</TableHead>
                <TableHead className="hidden lg:table-cell">Delivery Deadline</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} onClick={() => router.push(`/dashboard/shipment/${product.id}`)} className="cursor-pointer">
                  <TableCell className="font-medium">{product.productName || 'N/A'}</TableCell>
                  <TableCell className="hidden md:table-cell">{product.destination?.portOfDelivery || 'N/A'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{product.departureDate ? format(product.departureDate.toDate(), "PP") : 'N/A'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{product.deliveryDeadline ? format(product.deliveryDeadline.toDate(), "PP") : 'N/A'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getStatusVariant(product.status)} className={cn("capitalize", { "animate-blink bg-green-500/80": product.status === 'live' })}>
                        {product.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        isApproved && (
          <div className="border rounded-lg p-12 text-center bg-card dark:bg-card">
            <h2 className="text-xl font-semibold mb-2">No shipment requests yet</h2>
            <p className="text-muted-foreground">Click "New Shipment Request" to get started.</p>
          </div>
        )
      )}
    </div>
  );
}
