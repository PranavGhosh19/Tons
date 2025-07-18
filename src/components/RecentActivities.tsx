
'use client';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { collectionGroup, getDocs, query, where, getFirestore, doc, getDoc, orderBy, Timestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase'; 
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

const db = getFirestore(app);

interface Shipment {
  id: string;
  productName: string;
  destination: { portOfDelivery: string };
  status: string;
  goLiveAt: Timestamp | null;
  deliveryDeadline: Timestamp | null;
}

export function RecentActivities() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchRegisteredShipments = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return
      };

      try {
        const registerQuery = query(
          collectionGroup(db, 'register'),
          where('carrierId', '==', user.uid)
        );

        const registerSnap = await getDocs(registerQuery);
        const shipmentIds = new Set<string>();
        registerSnap.forEach((doc) => {
          const parentPath = doc.ref.parent.parent?.id;
          if (parentPath) shipmentIds.add(parentPath);
        });

        if (shipmentIds.size === 0) {
            setShipments([]);
            setLoading(false);
            return;
        }

        const shipmentPromises = Array.from(shipmentIds).map(async (shipmentId) => {
          const shipmentRef = doc(db, 'shipments', shipmentId);
          const shipmentSnap = await getDoc(shipmentRef);
          if (shipmentSnap.exists()) {
            return { id: shipmentSnap.id, ...shipmentSnap.data() } as Shipment;
          }
          return null;
        });

        const shipmentsData = (await Promise.all(shipmentPromises)).filter(Boolean) as Shipment[];
        
        shipmentsData.sort((a, b) => {
            const timeA = a.goLiveAt?.toDate()?.getTime() || 0;
            const timeB = b.goLiveAt?.toDate()?.getTime() || 0;
            return timeB - timeA;
        });

        setShipments(shipmentsData);
      } catch (err) {
        console.error('Error fetching shipments:', err);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = getAuth().onAuthStateChanged(user => {
        if (user) {
            fetchRegisteredShipments();
        } else {
            setLoading(false);
        }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="animate-spin mr-2" /> Loading recent activities...
      </div>
    );
  }

  if (shipments.length === 0) {
    return (
        <div className="text-center text-muted-foreground py-12">
            <p>No recent activity to display.</p>
            <p className="text-sm">Register your interest on scheduled shipments to see them here.</p>
        </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden md:table-cell">Destination</TableHead>
                    <TableHead className="hidden lg:table-cell">Delivery Deadline</TableHead>
                    <TableHead className="text-right">Goes Live On</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {shipments.map((shipment) => (
                    <TableRow key={shipment.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/carrier/shipment/${shipment.id}`)}>
                        <TableCell className="font-medium">{shipment.productName || 'N/A'}</TableCell>
                        <TableCell className="hidden md:table-cell">{shipment.destination?.portOfDelivery || 'N/A'}</TableCell>
                        <TableCell className="hidden lg:table-cell">{shipment.deliveryDeadline ? format(shipment.deliveryDeadline.toDate(), "PP") : 'N/A'}</TableCell>
                        <TableCell className="text-right">
                            {shipment.goLiveAt ? (
                                <span>{format(shipment.goLiveAt.toDate(), "PPp")}</span>
                            ) : (
                                <Badge variant="secondary">Not Scheduled</Badge>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  );
}
