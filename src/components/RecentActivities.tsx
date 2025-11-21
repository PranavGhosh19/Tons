
'use client';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, collectionGroup, getDocs, query, where, getFirestore, doc, getDoc, orderBy, Timestamp, onSnapshot } from 'firebase/firestore';
import { app } from '@/lib/firebase'; 
import { Info, Loader2, Send } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { User } from 'firebase/auth';
import { cn } from '@/lib/utils';

const db = getFirestore(app);

interface Bid {
    id: string;
    bidAmount: number;
    carrierId: string;
}

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
  winningBidId?: string;
  winningBidAmount?: number;
  userBid?: Bid | null;
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
            return onSnapshot(shipmentRef, async (docSnap) => {
                if (docSnap.exists()) {
                    const shipmentData = { id: docSnap.id, ...docSnap.data() } as Shipment;

                    // If awarded, fetch the user's specific bid
                    if (shipmentData.status === 'awarded') {
                        const bidsQuery = query(
                            collection(db, 'shipments', id, 'bids'), 
                            where('carrierId', '==', user.uid)
                        );
                        const bidsSnap = await getDocs(bidsQuery);
                        if (!bidsSnap.empty) {
                            const bidDoc = bidsSnap.docs[0];
                            shipmentData.userBid = { id: bidDoc.id, ...bidDoc.data() } as Bid;
                        }
                    }

                    setShipments(prevShipments => {
                        const existingIndex = prevShipments.findIndex(s => s.id === shipmentData.id);
                        let newShipmentsList;
                        if (existingIndex > -1) {
                            newShipmentsList = [...prevShipments];
                            newShipmentsList[existingIndex] = shipmentData;
                        } else {
                            newShipmentsList = [...prevShipments, shipmentData];
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

  const getStatusInfo = (shipment: Shipment): { text: string; variant: "success" | "secondary" | "outline" | "destructive" | "default" } => {
    switch (shipment.status) {
        case 'live':
            return { text: 'Live', variant: 'success' };
        case 'awarded':
            if (shipment.winningCarrierId === user?.uid) {
                return { text: 'You Won', variant: 'success' };
            }
            return { text: 'Better luck next time', variant: 'destructive' };
        case 'scheduled':
            return { text: 'Registered', variant: 'secondary' };
        case 'delivered':
             return { text: 'Delivered', variant: 'default' };
        default:
            return { text: 'Registered', variant: 'outline' };
    }
  }
  
  const hasAwardedShipment = shipments.some(s => s.status === 'awarded');

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
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {shipments.map((shipment) => {
                        const statusInfo = getStatusInfo(shipment);
                        
                        return (
                            <TableRow key={shipment.id} className="cursor-pointer" onClick={() => handleRowClick(shipment)}>
                                <TableCell className="font-medium">{shipment.productName || 'N/A'}</TableCell>
                                <TableCell className="hidden md:table-cell">{shipment.destination?.portOfDelivery || 'N/A'}</TableCell>
                                <TableCell className="hidden lg:table-cell">{shipment.deliveryDeadline ? format(shipment.deliveryDeadline.toDate(), "PP") : 'N/A'}</TableCell>
                                 <TableCell className="text-center">
                                    <Badge variant={statusInfo.variant} className={cn("capitalize", { "animate-blink bg-green-500/80": shipment.status === 'live' })}>
                                        {statusInfo.text}
                                    </Badge>
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
