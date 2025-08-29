
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, DocumentData } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, FileText, Anchor, Truck, Building2, Mail, Phone, User as UserIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const InfoCardSkeleton = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
            <Skeleton className="h-5 w-full" />
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

    const fetchShipmentAndPartyDetails = async () => {
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
            toast({ title: "Error", description: "Failed to fetch shipment and party details.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }
    
    fetchShipmentAndPartyDetails();

  }, [user, userType, shipmentId, router, toast]);

  const handleBackNavigation = () => {
    if (userType === 'exporter' || userType === 'employee') {
        router.push(`/dashboard/shipment/${shipmentId}`);
    } else if (userType === 'carrier') {
        router.push(`/dashboard/carrier/registered-shipment/${shipmentId}`);
    } else {
        router.push('/dashboard');
    }
  }

  if (loading || !shipment) {
    return (
      <div className="container py-6 md:py-10">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid md:grid-cols-2 gap-8 items-start">
            <InfoCardSkeleton />
            <InfoCardSkeleton />
        </div>
      </div>
    );
  }

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
                    <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <span>Exporter Company Name</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <UserIcon className="h-5 w-5 text-muted-foreground" />
                        <span>Exporter POC Name</span>
                    </div>
                     <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <span>exporter@example.com</span>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><Truck className="text-primary"/>Vendor Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <span>Vendor Company Name</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <UserIcon className="h-5 w-5 text-muted-foreground" />
                        <span>Vendor POC Name</span>
                    </div>
                     <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <span>vendor@example.com</span>
                    </div>
                </CardContent>
            </Card>
        </div>

        <Separator className="my-8" />
        
        <div>
            <h2 className="text-xl font-bold mb-4">Shipment Documents</h2>
             <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-center p-4">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Document Management Coming Soon</h3>
                <p className="text-muted-foreground max-w-md">This area will allow you to upload, download, and manage critical shipping documents like the Bill of Lading, Commercial Invoice, and Packing Lists.</p>
            </div>
        </div>
    </div>
  );
}
