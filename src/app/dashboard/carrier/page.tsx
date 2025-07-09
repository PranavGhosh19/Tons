
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collectionGroup, query, getDocs, DocumentData, orderBy, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function CarrierDashboardPage() {
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
        if (userDoc.exists() && userDoc.data()?.userType === 'carrier') {
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
      const shipmentsQuery = query(
          collectionGroup(db, 'products'), 
          orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(shipmentsQuery);
      
      const shipmentsListPromises = querySnapshot.docs.map(async (shipmentDoc) => {
          const shipmentData = shipmentDoc.data();
          const userRef = shipmentDoc.ref.parent.parent; 
          if (userRef) {
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                  shipmentData.exporterName = userSnap.data().name || 'Unknown Exporter';
              }
          }
          return { id: shipmentDoc.id, ...shipmentData };
      });
      const shipmentsList = await Promise.all(shipmentsListPromises);
      
      setShipments(shipmentsList);
    } catch (error: any) {
      console.error("Error fetching shipments: ", error);
      if (error.code === 'failed-precondition') {
          toast({ 
              title: "Indexing required", 
              description: "Firestore needs a new index for this query. Please check the browser console for a link to create it.",
              variant: "destructive",
              duration: 10000
            });
      } else {
          toast({ title: "Error", description: "Could not fetch available shipments.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
        fetchShipments();
    }
  }, [user, fetchShipments]);


  if (loading || !user) {
    return (
        <div className="container py-10">
            <div className="flex justify-between items-center mb-8">
                <Skeleton className="h-10 w-48" />
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold font-headline">Available Shipments</h1>
      </div>

      {shipments.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exporter</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Delivery Deadline</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell className="font-medium">{shipment.exporterName || 'N/A'}</TableCell>
                  <TableCell>{shipment.productName || 'N/A'}</TableCell>
                  <TableCell>{shipment.origin?.portOfLoading || 'N/A'}</TableCell>
                  <TableCell>{shipment.destination?.portOfDelivery || 'N/A'}</TableCell>
                  <TableCell>{shipment.deliveryDeadline ? format(shipment.deliveryDeadline.toDate(), "PPP") : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                      <Button variant="outline" size="sm">View & Bid</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center bg-card">
          <h2 className="text-xl font-semibold mb-2">No shipments available right now</h2>
          <p className="text-muted-foreground">Please check back later for new opportunities.</p>
        </div>
      )}
    </div>
  );
}
