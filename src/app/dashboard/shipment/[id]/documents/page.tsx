
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, DocumentData, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, FileText, Anchor, Truck, Building2, User as UserIcon, Phone, Save, PlusCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


const InfoCardSkeleton = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
        </CardHeader>
        <CardContent className="space-y-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
        </CardContent>
    </Card>
)

export default function ShipmentDocumentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [shipment, setShipment] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);

  // Exporter POC Input State
  const [exporterPocFullName, setExporterPocFullName] = useState("");
  const [exporterPocPhoneNumber, setExporterPocPhoneNumber] = useState("");
  const [isSavingExporter, setIsSavingExporter] = useState(false);

  // Vendor POC Input State
  const [vendorPocFullName, setVendorPocFullName] = useState("");
  const [vendorPocPhoneNumber, setVendorPocPhoneNumber] = useState("");
  const [isSavingVendor, setIsSavingVendor] = useState(false);

  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const shipmentId = params.id as string;

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              setUserType(userDoc.data()?.userType || null);
            }
        } else {
            router.push("/login");
        }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!user || !userType || !shipmentId) return;

    const fetchShipmentDetails = async () => {
        setLoading(true);
        try {
            const shipmentDocRef = doc(db, "shipments", shipmentId);
            const docSnap = await getDoc(shipmentDocRef);

            if (docSnap.exists()) {
                const shipmentData = docSnap.data();
                
                const isOwner = shipmentData.exporterId === user.uid;
                const isWinningCarrier = shipmentData.winningCarrierId === user.uid;
                const isEmployee = userType === 'employee';

                if (shipmentData.status === 'awarded' && (isOwner || isWinningCarrier || isEmployee)) {
                    setShipment({ id: docSnap.id, ...shipmentData });
                    // Pre-fill POC info from the shipment doc itself
                    setExporterPocFullName(shipmentData.exporterPocFullName || '');
                    setExporterPocPhoneNumber(shipmentData.exporterPocPhoneNumber || '');
                    setVendorPocFullName(shipmentData.vendorPocFullName || '');
                    setVendorPocPhoneNumber(shipmentData.vendorPocPhoneNumber || '');
                } else {
                    toast({ title: "Unauthorized", description: "You don't have permission to view these documents.", variant: "destructive" });
                    router.push(`/dashboard`);
                }
            } else {
                toast({ title: "Error", description: "Shipment not found.", variant: "destructive" });
                router.push("/dashboard");
            }
        } catch (error) {
            console.error("Error fetching data: ", error);
            toast({ title: "Error", description: "Failed to fetch shipment details.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }
    
    fetchShipmentDetails();

  }, [user, userType, shipmentId, router, toast]);

  const handlePocUpdate = async (type: 'exporter' | 'vendor') => {
    if (!shipment) return;

    let dataToUpdate = {};
    let successMessage = "";

    if (type === 'exporter') {
        setIsSavingExporter(true);
        dataToUpdate = {
            exporterPocFullName: exporterPocFullName,
            exporterPocPhoneNumber: exporterPocPhoneNumber
        };
        successMessage = "Exporter's contact details have been updated.";
    } else {
        setIsSavingVendor(true);
        dataToUpdate = {
            vendorPocFullName: vendorPocFullName,
            vendorPocPhoneNumber: vendorPocPhoneNumber
        };
        successMessage = "Vendor's contact details have been updated.";
    }
    
    try {
        const shipmentDocRef = doc(db, "shipments", shipment.id);
        await updateDoc(shipmentDocRef, dataToUpdate);
        toast({ title: "Success", description: successMessage });
    } catch (error) {
        console.error(`Error saving ${type} POC details:`, error);
        toast({ title: "Error", description: "Failed to save contact details.", variant: "destructive" });
    } finally {
        if (type === 'exporter') setIsSavingExporter(false);
        else setIsSavingVendor(false);
    }
  };

  const handleBackNavigation = () => {
    router.push(`/dashboard/shipment/${shipmentId}`);
  }

  if (loading || !shipment) {
    return (
      <div className="container py-6 md:py-10">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid md:grid-cols-2 gap-8 items-start">
            <InfoCardSkeleton />
            <InfoCardSkeleton />
        </div>
        <Skeleton className="h-64 w-full mt-8" />
      </div>
    );
  }
  
  const canEditExporterInfo = user && (user.uid === shipment.exporterId || userType === 'employee');
  const canEditVendorInfo = user && (user.uid === shipment.winningCarrierId || userType === 'employee');

  return (
    <div className="container py-6 md:py-10">
        <div className="flex justify-between items-center mb-6">
             <Button variant="ghost" onClick={handleBackNavigation}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Shipment
            </Button>
        </div>
        
        <div className="mb-8">
            <Card className="border-none shadow-none">
                <CardHeader className="px-0">
                    <CardTitle className="flex items-center gap-3 text-2xl font-headline">
                       <FileText className="h-6 w-6 text-primary"/> Document Center
                    </CardTitle>
                    <CardDescription>Contact information and documents for shipment: {shipment.productName}</CardDescription>
                </CardHeader>
            </Card>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 items-start">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><Anchor className="text-primary"/>Exporter Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div className="flex items-center gap-3 font-semibold">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <span>{shipment?.exporterName || "Exporter Company Name"}</span>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                        <div className="space-y-2">
                           <Label htmlFor="poc-name" className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-muted-foreground"/> POC Full Name</Label>
                           <Input 
                                id="poc-name" 
                                value={exporterPocFullName} 
                                onChange={(e) => setExporterPocFullName(e.target.value)} 
                                placeholder="Enter full name"
                                disabled={!canEditExporterInfo || isSavingExporter}
                           />
                        </div>
                         <div className="space-y-2">
                           <Label htmlFor="poc-phone" className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/> POC Number</Label>
                           <Input 
                                id="poc-phone" 
                                value={exporterPocPhoneNumber} 
                                onChange={(e) => setExporterPocPhoneNumber(e.target.value)} 
                                placeholder="Enter phone number"
                                disabled={!canEditExporterInfo || isSavingExporter}
                           />
                        </div>
                        {canEditExporterInfo && (
                            <div className="flex justify-end">
                                <Button size="sm" onClick={() => handlePocUpdate('exporter')} disabled={isSavingExporter}>
                                    <Save className="mr-2 h-4 w-4"/>
                                    {isSavingExporter ? "Saving..." : "Save"}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><Truck className="text-primary"/>Vendor Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div className="flex items-center gap-3 font-semibold">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <span>{shipment?.winningCarrierLegalName || "Vendor Company Name"}</span>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                         <div className="space-y-2">
                           <Label htmlFor="vendor-poc-name" className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-muted-foreground"/> POC Full Name</Label>
                           <Input 
                                id="vendor-poc-name" 
                                value={vendorPocFullName} 
                                onChange={(e) => setVendorPocFullName(e.target.value)} 
                                placeholder="Enter full name"
                                disabled={!canEditVendorInfo || isSavingVendor}
                           />
                        </div>
                         <div className="space-y-2">
                           <Label htmlFor="vendor-poc-phone" className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/> POC Number</Label>
                           <Input 
                                id="vendor-poc-phone" 
                                value={vendorPocPhoneNumber} 
                                onChange={(e) => setVendorPocPhoneNumber(e.target.value)} 
                                placeholder="Enter phone number"
                                disabled={!canEditVendorInfo || isSavingVendor}
                           />
                        </div>
                        {canEditVendorInfo && (
                            <div className="flex justify-end">
                                <Button size="sm" onClick={() => handlePocUpdate('vendor')} disabled={isSavingVendor}>
                                    <Save className="mr-2 h-4 w-4"/>
                                    {isSavingVendor ? "Saving..." : "Save"}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>

        <Separator className="my-8" />
        
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Shipment Documents</CardTitle>
                    <CardDescription>Manage all documents related to this shipment.</CardDescription>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Upload Document
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Upload New Document</DialogTitle>
                            <DialogDescription>
                                Select a file from your local machine and give it a name.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="doc-name">Name of the Document</Label>
                                <Input id="doc-name" placeholder="e.g., Bill of Lading" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="doc-file">Upload Document</Label>
                                <Input id="doc-file" type="file" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Upload</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Document Name</TableHead>
                                <TableHead className="hidden md:table-cell">Uploaded By</TableHead>
                                <TableHead className="hidden md:table-cell">Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No documents have been uploaded yet.
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
