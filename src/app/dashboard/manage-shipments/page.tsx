
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, getDocs, DocumentData, orderBy, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ManageShipmentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [shipments, setShipments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data()?.userType === 'employee') {
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
  
  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const shipmentsCollectionRef = collection(db, 'shipments');
      const q = query(shipmentsCollectionRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const shipmentsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setShipments(shipmentsList);
    } catch (error) {
      console.error("Error fetching shipments: ", error);
      toast({ title: "Error", description: "Could not fetch shipments.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      fetchShipments();
    }
  }, [user, fetchShipments]);

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

  const handleRowClick = (shipmentId: string) => {
    // For now, let's just log it. We can implement a detail view later.
    console.log(`Navigating to shipment ${shipmentId}`);
    // A potential future implementation:
    // router.push(`/dashboard/admin/shipment/${shipmentId}`);
  };

  if (loading) {
    return (
        <div className="container py-6 md:py-10">
            <div className="flex justify-between items-center mb-8">
                <Skeleton className="h-10 w-64" />
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
    )
  }

  return (
    <div className="container py-6 md:py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Manage All Shipments</h1>
      </div>

      {shipments.length > 0 ? (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Exporter</TableHead>
                <TableHead className="hidden md:table-cell">Destination</TableHead>
                <TableHead className="hidden lg:table-cell">Created At</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((shipment) => (
                <TableRow key={shipment.id} onClick={() => handleRowClick(shipment.id)} className="cursor-pointer">
                  <TableCell className="font-medium">{shipment.productName || 'N/A'}</TableCell>
                  <TableCell>{shipment.exporterName || 'N/A'}</TableCell>
                  <TableCell className="hidden md:table-cell">{shipment.destination?.portOfDelivery || 'N/A'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{shipment.createdAt ? format(shipment.createdAt.toDate(), "dd/MM/yyyy") : 'N/A'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getStatusVariant(shipment.status)} className={cn("capitalize", { "animate-blink bg-green-500/80": shipment.status === 'live' })}>
                        {shipment.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center bg-card dark:bg-card">
          <h2 className="text-xl font-semibold mb-2">No shipments found</h2>
          <p className="text-muted-foreground">There are currently no shipments on the platform.</p>
        </div>
      )}
    </div>
  );
}
