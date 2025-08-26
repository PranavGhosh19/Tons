
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
import { ArrowLeft, Upload, FileText, Download } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function ShipmentDocumentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] =useState<string | null>(null);
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

    const shipmentDocRef = doc(db, "shipments", shipmentId);
    getDoc(shipmentDocRef).then(docSnap => {
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
      setLoading(false);
    }).catch(error => {
        console.error("Error fetching shipment: ", error);
        toast({ title: "Error", description: "Failed to fetch shipment details.", variant: "destructive" });
        setLoading(false);
    });

  }, [user, userType, shipmentId, router, toast]);

  const handleBackNavigation = () => {
    if (userType === 'carrier') {
        router.push(`/dashboard/carrier/registered-shipment/${shipmentId}`);
    } else {
        router.push(`/dashboard/shipment/${shipmentId}`);
    }
  }

  if (loading || !shipment) {
    return (
      <div className="container py-6 md:py-10">
        <Skeleton className="h-8 w-32 mb-8" />
        <Skeleton className="h-96 w-full" />
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
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                   <FileText className="h-6 w-6 text-primary"/> Document Center
                </CardTitle>
                <CardDescription>Manage and access all documents related to shipment: {shipment.productName}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-center p-4">
                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Document Management Coming Soon</h3>
                    <p className="text-muted-foreground max-w-md">This area will allow you to upload, download, and manage critical shipping documents like the Bill of Lading, Commercial Invoice, and Packing Lists.</p>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}

    