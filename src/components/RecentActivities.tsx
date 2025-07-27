
'use client';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { collectionGroup, getDocs, query, where, getFirestore, doc, getDoc, orderBy, Timestamp, onSnapshot } from 'firebase/firestore';
import { app } from '@/lib/firebase'; 
import { Info, Loader2, Send } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { User } from 'firebase/auth';
import { cn } from '@/lib/utils';

const db = getFirestore(app);

interface Shipment {
  id: string;
  productName: string;
  exporterName?: string;
  shipmentType?: string;
  hsnCode?: string;
  modeOfShipment?: string;
  origin?: { portOfLoading: string; zipCode?: string };
  destination: { portOfDelivery: string; zipCode?: string };
  departureDate?: Timestamp;
  deliveryDeadline: Timestamp | null;
  cargo?: {
    type?: string;
    packageType?: string;
    weight?: string;
    dimensions?: {
      length?: string;
      width?: string;
      height?: string;
      unit?: string;
    };
  };
  specialInstructions?: string;
  status: string;
  goLiveAt: Timestamp | null;
  winningCarrierId?: string;
}

export function RecentActivities() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = getAuth().onAuthStateChanged(user => {
      if (user) {
        setUser(user);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);
  
  useEffect(() => {
    if (!user) return;
    
    let unsubscribers: (() => void)[] = [];

    const fetchAndListen = async () => {
        const registerQuery = query(
            collectionGroup(db, 'register'),
            where('carrierId', '==', user.uid)
        );
        const registerSnap = await getDocs(registerQuery);
        const shipmentIds = registerSnap.docs.map(doc => doc.ref.parent.parent!.id);

        if (shipmentIds.length === 0) {
            setShipments([]);
            setLoading(false);
            return;
        }

        unsubscribers = shipmentIds.map(id => {
            const shipmentRef = doc(db, 'shipments', id);
            return onSnapshot(shipmentRef, (docSnap) => {
                if (docSnap.exists()) {
                    const newShipment = { id: docSnap.id, ...docSnap.data() } as Shipment;
                    setShipments(prevShipments => {
                        const existingIndex = prevShipments.findIndex(s => s.id === newShipment.id);
                        let newShipmentsList;
                        if (existingIndex > -1) {
                            newShipmentsList = [...prevShipments];
                            newShipmentsList[existingIndex] = newShipment;
                        } else {
                            newShipmentsList = [...prevShipments, newShipment];
                        }
                        return newShipmentsList.sort((a, b) => {
                            const timeA = a.goLiveAt?.toDate()?.getTime() || 0;
                            const timeB = b.goLiveAt?.toDate()?.getTime() || 0;
                            return timeB - timeA;
                        });
                    });
                }
            });
        });
        setLoading(false);
    };

    fetchAndListen();

    return () => {
        unsubscribers.forEach(unsub => unsub());
    };

  }, [user]);

  const handleRowClick = (shipment: Shipment) => {
    if (shipment.status === 'live') {
      router.push(`/dashboard/carrier/shipment/${shipment.id}`);
    } else {
      router.push(`/dashboard/carrier/registered-shipment/${shipment.id}`);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'live':
        return 'success';
      case 'registered':
      case 'scheduled':
        return 'secondary';
      default:
        return 'outline';
    }
  }

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
    <>
        <div className="border rounded-lg overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="hidden md:table-cell">Destination</TableHead>
                        <TableHead className="hidden lg:table-cell">Delivery Deadline</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Goes Live On</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {shipments.map((shipment) => {
                        const statusText = shipment.status === 'live' ? 'Live' : 'Registered';
                        
                        return (
                            <TableRow key={shipment.id} className="cursor-pointer" onClick={() => handleRowClick(shipment)}>
                                <TableCell className="font-medium">{shipment.productName || 'N/A'}</TableCell>
                                <TableCell className="hidden md:table-cell">{shipment.destination?.portOfDelivery || 'N/A'}</TableCell>
                                <TableCell className="hidden lg:table-cell">{shipment.deliveryDeadline ? format(shipment.deliveryDeadline.toDate(), "PP") : 'N/A'}</TableCell>
                                 <TableCell className="text-center">
                                    <Badge variant={getStatusVariant(shipment.status)} className={cn("capitalize", { "animate-blink bg-green-500/80": shipment.status === 'live' })}>
                                        {statusText}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {shipment.goLiveAt ? (
                                        <span>{format(shipment.goLiveAt.toDate(), "PPp")}</span>
                                    ) : (
                                        <Badge variant="secondary">Not Scheduled</Badge>
                                    )}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    </>
  );
}
