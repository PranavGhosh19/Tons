
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, query, getDocs, DocumentData, orderBy, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Calendar as CalendarIcon, Send } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

export default function ExporterDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  
  // Form state
  const [productName, setProductName] = useState("");
  const [cargoType, setCargoType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [weight, setWeight] = useState("");
  const [dimensionL, setDimensionL] = useState("");
  const [dimensionW, setDimensionW] = useState("");
  const [dimensionH, setDimensionH] = useState("");
  const [departureDate, setDepartureDate] = useState<Date>();
  const [deliveryDeadline, setDeliveryDeadline] = useState<Date>();
  const [portOfLoading, setPortOfLoading] = useState("");
  const [originZip, setOriginZip] = useState("");
  const [portOfDelivery, setPortOfDelivery] = useState("");
  const [destinationZip, setDestinationZip] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);
  
  const fetchProducts = useCallback(async (uid: string) => {
    try {
      const productsCollectionRef = collection(db, 'users', uid, 'products');
      const q = query(productsCollectionRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const productsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsList);
    } catch (error) {
      console.error("Error fetching products: ", error);
      toast({ title: "Error", description: "Could not fetch products.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      fetchProducts(user.uid);
    }
  }, [user, fetchProducts]);

  const resetForm = () => {
    setProductName("");
    setCargoType("");
    setQuantity("");
    setWeight("");
    setDimensionL("");
    setDimensionW("");
    setDimensionH("");
    setDepartureDate(undefined);
    setDeliveryDeadline(undefined);
    setPortOfLoading("");
    setOriginZip("");
    setPortOfDelivery("");
    setDestinationZip("");
    setSpecialInstructions("");
  }

  const handleCreateShipment = async () => {
    if (!productName || !portOfLoading || !originZip || !portOfDelivery || !destinationZip || !departureDate || !deliveryDeadline) {
      toast({ title: "Error", description: "Please fill out all required fields.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create a shipment.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'products'), {
        productName,
        cargo: {
          type: cargoType,
          quantity,
          weight,
          dimensions: {
            length: dimensionL,
            width: dimensionW,
            height: dimensionH,
          },
        },
        departureDate: departureDate ? Timestamp.fromDate(departureDate) : null,
        deliveryDeadline: deliveryDeadline ? Timestamp.fromDate(deliveryDeadline) : null,
        origin: {
            portOfLoading,
            zipCode: originZip,
        },
        destination: {
            portOfDelivery,
            zipCode: destinationZip,
        },
        specialInstructions,
        createdAt: new Date(),
      });
      toast({ title: "Success", description: "Shipment request created." });
      resetForm();
      setOpen(false);
      await fetchProducts(user.uid); // Refetch products
    } catch (error) {
      console.error("Error adding document: ", error);
      toast({ title: "Error", description: "Failed to create shipment request.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
        <div className="container py-10">
            <div className="flex justify-between items-center mb-8">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-48" />
            </div>
            <Skeleton className="h-64 w-full" />
        </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold font-headline">My Shipments</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> New Shipment Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline">New Shipment</DialogTitle>
            </DialogHeader>
            <div className="grid gap-8 py-4">
              <Card>
                <CardHeader><CardTitle>Product & Cargo Details</CardTitle></CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="product-name">Product Name</Label>
                    <Input id="product-name" placeholder="e.g., Electronics, Textiles" value={productName} onChange={e => setProductName(e.target.value)} disabled={isSubmitting} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cargo-type">Cargo Type</Label>
                    <Input id="cargo-type" placeholder="e.g., General, Reefer, HAZMAT" value={cargoType} onChange={e => setCargoType(e.target.value)} disabled={isSubmitting} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input id="quantity" type="number" placeholder="e.g., 500" value={quantity} onChange={e => setQuantity(e.target.value)} disabled={isSubmitting} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="weight">Total Weight</Label>
                    <div className="flex items-center">
                        <Input id="weight" type="number" placeholder="e.g., 1200" value={weight} onChange={e => setWeight(e.target.value)} disabled={isSubmitting} className="rounded-r-none" />
                        <span className="bg-muted text-muted-foreground px-3 py-2 border border-l-0 rounded-r-md">kg</span>
                    </div>
                  </div>
                   <div className="grid gap-2 md:col-span-2">
                    <Label>Dimensions</Label>
                    <div className="grid grid-cols-3 gap-2">
                        <Input placeholder="Length" value={dimensionL} onChange={e => setDimensionL(e.target.value)} disabled={isSubmitting} />
                        <Input placeholder="Width" value={dimensionW} onChange={e => setDimensionW(e.target.value)} disabled={isSubmitting} />
                        <Input placeholder="Height" value={dimensionH} onChange={e => setDimensionH(e.target.value)} disabled={isSubmitting} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                  <CardHeader><CardTitle>Scheduling</CardTitle></CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="departure-date">Preferred Departure Date</Label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className={cn("justify-start text-left font-normal", !departureDate && "text-muted-foreground")}
                            disabled={isSubmitting}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {departureDate ? format(departureDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={departureDate} onSelect={setDepartureDate} initialFocus />
                        </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="delivery-deadline">Delivery Deadline</Label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className={cn("justify-start text-left font-normal", !deliveryDeadline && "text-muted-foreground")}
                            disabled={isSubmitting}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {deliveryDeadline ? format(deliveryDeadline, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={deliveryDeadline} onSelect={setDeliveryDeadline} initialFocus />
                        </PopoverContent>
                        </Popover>
                    </div>
                  </CardContent>
              </Card>
              
              <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                      <CardHeader><CardTitle>Origin</CardTitle></CardHeader>
                      <CardContent className="grid gap-6">
                          <div className="grid gap-2">
                              <Label htmlFor="port-of-loading">Port of Loading</Label>
                              <Input id="port-of-loading" placeholder="e.g., Port of Hamburg" value={portOfLoading} onChange={e => setPortOfLoading(e.target.value)} disabled={isSubmitting} />
                          </div>
                          <div className="grid gap-2">
                              <Label htmlFor="origin-zip">Pin / Zip Code</Label>
                              <Input id="origin-zip" placeholder="e.g., 20457" value={originZip} onChange={e => setOriginZip(e.target.value)} disabled={isSubmitting} />
                          </div>
                      </CardContent>
                  </Card>
                  <Card>
                      <CardHeader><CardTitle>Destination</CardTitle></CardHeader>
                      <CardContent className="grid gap-6">
                          <div className="grid gap-2">
                              <Label htmlFor="port-of-delivery">Port of Delivery</Label>
                              <Input id="port-of-delivery" placeholder="e.g., Port of Shanghai" value={portOfDelivery} onChange={e => setPortOfDelivery(e.target.value)} disabled={isSubmitting} />
                          </div>
                          <div className="grid gap-2">
                              <Label htmlFor="destination-zip">Pin / Zip Code</Label>
                              <Input id="destination-zip" placeholder="e.g., 200000" value={destinationZip} onChange={e => setDestinationZip(e.target.value)} disabled={isSubmitting} />
                          </div>
                      </CardContent>
                  </Card>
              </div>
            
              <Card>
                  <CardHeader><CardTitle>Additional Information</CardTitle></CardHeader>
                  <CardContent>
                      <div className="grid gap-2">
                          <Label htmlFor="special-instructions">Special Instructions</Label>
                          <Textarea id="special-instructions" placeholder="e.g., Handle with care, keep refrigerated below 5°C." value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} disabled={isSubmitting} />
                      </div>
                  </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateShipment} disabled={isSubmitting}>
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {products.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Departure Date</TableHead>
                <TableHead className="text-right">Delivery Deadline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.productName || 'N/A'}</TableCell>
                  <TableCell>{product.destination?.portOfDelivery || 'N/A'}</TableCell>
                  <TableCell>{product.departureDate ? format(product.departureDate.toDate(), "PPP") : 'N/A'}</TableCell>
                  <TableCell className="text-right">{product.deliveryDeadline ? format(product.deliveryDeadline.toDate(), "PPP") : 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center bg-card">
          <h2 className="text-xl font-semibold mb-2">No shipment requests yet</h2>
          <p className="text-muted-foreground">Click "New Shipment Request" to get started.</p>
        </div>
      )}
    </div>
  );
}
