
"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, limit, collectionGroup } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Search, FileText, Clock } from "lucide-react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const DashboardCard = ({ title, description, href, icon: Icon }: { title: string, description: string, href: string, icon: React.ElementType }) => (
    <Link href={href}>
        <Card className="hover:border-primary hover:bg-secondary transition-all h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">{title}</CardTitle>
                <Icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    </Link>
);


export default function CarrierDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [carrierName, setCarrierName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [registeredShipments, setRegisteredShipments] = useState<any[]>([]);
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data()?.userType === 'carrier') {
           setUser(currentUser);
           setCarrierName(userDoc.data()?.name || 'Anonymous Carrier');
           
           // Fetch registered shipments
            const registerQuery = query(
                collectionGroup(db, "register"),
                where("carrierId", "==", currentUser.uid)
            );
            const registerSnapshots = await getDocs(registerQuery);
            const shipmentPromises = registerSnapshots.docs.map(async (docSnap) => {
                const pathParts = docSnap.ref.path.split('/');
                const shipmentId = pathParts[1]; 
                const shipmentDoc = await getDoc(doc(db, 'shipments', shipmentId));
                return shipmentDoc.exists() ? { id: shipmentId, ...shipmentDoc.data() } : null;
            });
            const shipmentResults = (await Promise.all(shipmentPromises)).filter(Boolean);
            setRegisteredShipments(shipmentResults);

           setLoading(false);
        } else {
            router.push('/dashboard');
        }
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);
  
  if (loading || !user) {
    return (
        <div className="container py-6 md:py-10">
            <div className="flex justify-between items-center mb-8">
                <Skeleton className="h-10 w-64" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
            <div className="mt-12">
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    )
  }

  return (
    <div className="container py-6 md:py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Welcome, {carrierName}</h1>
        <Button asChild>
            <Link href="/dashboard/carrier/find-shipments">
                Find Shipments <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard 
            title="Find New Shipments"
            description="Browse and bid on available shipments."
            href="/dashboard/carrier/find-shipments"
            icon={Search}
        />
        <DashboardCard 
            title="My Bids"
            description="Track the status of your active bids."
            href="#"
            icon={FileText}
        />
        <DashboardCard 
            title="Earnings"
            description="View your completed jobs and earnings."
            href="#"
            icon={FileText}
        />
      </div>

       <div className="mt-12">
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Shipments you have registered an interest in bidding on.</CardDescription>
                </CardHeader>
                <CardContent>
                   {registeredShipments.length > 0 ? (
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
                                {registeredShipments.map((shipment) => (
                                    <TableRow key={shipment.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/carrier/shipment/${shipment.id}`)}>
                                        <TableCell className="font-medium">{shipment.productName || 'N/A'}</TableCell>
                                        <TableCell className="hidden md:table-cell">{shipment.destination?.portOfDelivery || 'N/A'}</TableCell>
                                        <TableCell className="hidden lg:table-cell">{shipment.deliveryDeadline ? format(shipment.deliveryDeadline.toDate(), "PP") : 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            {shipment.goLiveAt ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    <span>{format(shipment.goLiveAt.toDate(), "PPp")}</span>
                                                </div>
                                            ) : (
                                                <Badge variant="secondary">Not Scheduled</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                   ) : (
                    <div className="text-center text-muted-foreground py-12">
                        <p>No recent activity to display.</p>
                        <p className="text-sm">Register your interest on scheduled shipments to see them here.</p>
                    </div>
                   )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
