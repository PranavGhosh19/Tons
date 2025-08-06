
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, DocumentData, orderBy, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isSameDay, isToday, isTomorrow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Search, X, Filter, RadioTower, Sunrise, Award } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const StatCard = ({ title, value, icon: Icon }: { title: string, value: number, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

export default function ManageShipmentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [shipments, setShipments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [goLiveDateFilter, setGoLiveDateFilter] = useState<Date | undefined>();

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
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
    return () => unsubscribeAuth();
  }, [router]);
  
  useEffect(() => {
    let unsubscribeSnapshots: () => void = () => {};

    if (user) {
        setLoading(true);
        const shipmentsCollectionRef = collection(db, 'shipments');
        const q = query(shipmentsCollectionRef, orderBy('createdAt', 'desc'));

        unsubscribeSnapshots = onSnapshot(q, (querySnapshot) => {
            const shipmentsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setShipments(shipmentsList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching shipments in real-time: ", error);
            if (error.code !== 'permission-denied') {
              toast({ title: "Error", description: "Could not fetch shipments.", variant: "destructive" });
            }
            setLoading(false);
        });
    }

    return () => {
        unsubscribeSnapshots();
    };
  }, [user, toast]);
  
  const filteredShipments = useMemo(() => {
    return shipments.filter(shipment => {
        const searchTermMatch = searchTerm 
            ? (shipment.productName && shipment.productName.toLowerCase().includes(searchTerm.toLowerCase())) ||
              (shipment.exporterName && shipment.exporterName.toLowerCase().includes(searchTerm.toLowerCase()))
            : true;

        const statusMatch = statusFilter !== 'all' ? shipment.status === statusFilter : true;
        
        const dateMatch = dateFilter 
            ? (shipment.createdAt && isSameDay(shipment.createdAt.toDate(), dateFilter))
            : true;
        
        const goLiveDateMatch = goLiveDateFilter
            ? (shipment.goLiveAt && isSameDay(shipment.goLiveAt.toDate(), goLiveDateFilter))
            : true;

        return searchTermMatch && statusMatch && dateMatch && goLiveDateMatch;
    });
  }, [shipments, searchTerm, statusFilter, dateFilter, goLiveDateFilter]);

  const stats = useMemo(() => {
    const liveToday = shipments.filter(s => s.goLiveAt && isToday(s.goLiveAt.toDate())).length;
    const liveTomorrow = shipments.filter(s => s.goLiveAt && isTomorrow(s.goLiveAt.toDate())).length;
    const awarded = shipments.filter(s => s.status === 'awarded').length;
    return { liveToday, liveTomorrow, awarded };
  }, [shipments]);


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
    router.push(`/dashboard/shipment/${shipmentId}`);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFilter(undefined);
    setGoLiveDateFilter(undefined);
  }

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Manage All Shipments</h1>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <StatCard title="Live for Today" value={stats.liveToday} icon={RadioTower} />
            <StatCard title="Live Tomorrow" value={stats.liveTomorrow} icon={Sunrise} />
            <StatCard title="Awarded" value={stats.awarded} icon={Award} />
       </div>

      <div className="flex justify-end mb-4">
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="mr-2 h-4 w-4" />
          {showFilters ? 'Hide Filters' : 'Apply Filter'}
        </Button>
      </div>

       <Collapsible open={showFilters} className="mb-8">
        <CollapsibleContent>
            <div className="p-4 border rounded-lg bg-card grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
                <div className="relative xl:col-span-1">
                    <label className="text-sm font-medium text-muted-foreground">Search Product/Exporter</label>
                    <Search className="absolute left-3 top-1/2 mt-2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="xl:col-span-1">
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="live">Live</SelectItem>
                            <SelectItem value="awarded">Awarded</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="xl:col-span-1">
                    <label className="text-sm font-medium text-muted-foreground">Creation Date</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !dateFilter && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateFilter ? format(dateFilter, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={dateFilter}
                                onSelect={setDateFilter}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="xl:col-span-1">
                    <label className="text-sm font-medium text-muted-foreground">On Live Date</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !goLiveDateFilter && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {goLiveDateFilter ? format(goLiveDateFilter, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={goLiveDateFilter}
                                onSelect={setGoLiveDateFilter}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="xl:col-span-1">
                    <Button variant="ghost" onClick={clearFilters} className="w-full">
                        <X className="mr-2 h-4 w-4" /> Clear Filters
                    </Button>
                </div>
            </div>
        </CollapsibleContent>
       </Collapsible>

      {filteredShipments.length > 0 ? (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Exporter</TableHead>
                <TableHead className="hidden md:table-cell">Destination</TableHead>
                <TableHead className="hidden lg:table-cell">Created At</TableHead>
                <TableHead className="hidden lg:table-cell">Scheduled For</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShipments.map((shipment) => (
                <TableRow key={shipment.id} onClick={() => handleRowClick(shipment.id)} className="cursor-pointer">
                  <TableCell className="font-medium">{shipment.productName || 'N/A'}</TableCell>
                  <TableCell>{shipment.exporterName || 'N/A'}</TableCell>
                  <TableCell className="hidden md:table-cell">{shipment.destination?.portOfDelivery || 'N/A'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{shipment.createdAt ? format(shipment.createdAt.toDate(), "dd/MM/yyyy") : 'N/A'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{shipment.goLiveAt ? format(shipment.goLiveAt.toDate(), "dd/MM/yyyy p") : 'N/A'}</TableCell>
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
          <p className="text-muted-foreground">There are currently no shipments on the platform matching your filters.</p>
        </div>
      )}
    </div>
  );
}
