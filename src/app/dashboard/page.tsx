"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, DocumentData, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
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
  
  const fetchProducts = async (uid: string) => {
    try {
      const q = query(collection(db, 'products'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const productsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsList);
    } catch (error) {
      console.error("Error fetching products: ", error);
      toast({ title: "Error", description: "Could not fetch products.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProducts(user.uid);
    }
  }, [user, toast]);

  const handleAddProduct = async () => {
    if (!productName || !price) {
      toast({ title: "Error", description: "Please fill out all fields.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to add products.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'products'), {
        name: productName,
        price: parseFloat(price),
        userId: user.uid,
        createdAt: new Date(),
      });
      toast({ title: "Success", description: "Product added successfully." });
      setProductName('');
      setPrice('');
      setOpen(false);
      await fetchProducts(user.uid); // Refetch products
    } catch (error) {
      console.error("Error adding document: ", error);
      toast({ title: "Error", description: "Failed to add product.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
        <div className="container py-10">
            <div className="flex justify-between items-center mb-8">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-64 w-full" />
        </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Fill in the details for your new product. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="product-name" className="text-right">
                  Product name
                </Label>
                <Input id="product-name" placeholder="e.g. T-shirt" className="col-span-3" value={productName} onChange={e => setProductName(e.target.value)} disabled={isSubmitting} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  Price
                </Label>
                <Input id="price" type="number" placeholder="e.g. 25.00" className="col-span-3" value={price} onChange={e => setPrice(e.target.value)} disabled={isSubmitting} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddProduct} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save'}
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
                <TableHead>Product Name</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-right">${parseFloat(product.price).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center bg-card">
          <h2 className="text-xl font-semibold mb-2">No products yet</h2>
          <p className="text-muted-foreground">Click "Add Product" to get started.</p>
        </div>
      )}
    </div>
  );
}
