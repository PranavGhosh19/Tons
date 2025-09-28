
"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, DocumentData, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Check, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function VerificationPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pendingUsers, setPendingUsers] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<DocumentData | null>(null);
  
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

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(collection(db, "users"), where("verificationStatus", "==", "pending"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const users: DocumentData[] = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      setPendingUsers(users);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching pending users: ", error);
        toast({ title: "Error", description: "Failed to load pending verifications.", variant: "destructive" });
        setLoading(false);
    });

    return () => unsubscribe();

  }, [user, toast]);

  const handleVerification = async (userId: string, status: 'approved' | 'rejected') => {
      try {
          const userDocRef = doc(db, "users", userId);
          await updateDoc(userDocRef, { verificationStatus: status });
          toast({
              title: "Success",
              description: `User has been ${status}.`
          });
          setSelectedUser(null);
      } catch (error) {
          console.error(`Error updating user status:`, error);
           toast({
              title: "Error",
              description: `Failed to update user status.`,
              variant: "destructive"
          });
      }
  }


  if (loading) {
    return (
        <div className="container py-6 md:py-10">
            <Skeleton className="h-8 w-48 mb-8" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
  }
  
  const InfoRow = ({ label, value }: { label: string, value: string | undefined }) => (
    <div className="flex justify-between border-b py-2">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="font-semibold text-right">{value || 'N/A'}</dd>
    </div>
  )

  return (
    <div className="container py-6 md:py-10">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold font-headline">Verification Center</h1>
        </div>

        {pendingUsers.length > 0 ? (
            <Card>
                <CardHeader>
                    <CardTitle>Pending Verifications</CardTitle>
                    <CardDescription>Review and approve or deny new exporter applications.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Company Name</TableHead>
                                    <TableHead>User Email</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingUsers.map((pUser) => (
                                    <TableRow key={pUser.id}>
                                        <TableCell className="font-medium">{pUser.companyDetails?.legalName || pUser.name}</TableCell>
                                        <TableCell>{pUser.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={pUser.userType === 'exporter' ? 'default' : 'secondary'} className="capitalize">{pUser.userType}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Dialog onOpenChange={(open) => !open && setSelectedUser(null)}>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm" onClick={() => setSelectedUser(pUser)}>
                                                        <Eye className="mr-2 h-4 w-4" /> View Details
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-xl">
                                                    <DialogHeader>
                                                        <DialogTitle>Verification Details</DialogTitle>
                                                        <DialogDescription>
                                                            Review the information submitted by {selectedUser?.name}.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    {selectedUser?.companyDetails ? (
                                                        <div className="py-4 space-y-2">
                                                            <dl className="space-y-2">
                                                                <InfoRow label="Legal Name" value={selectedUser.companyDetails.legalName} />
                                                                <InfoRow label="GST" value={selectedUser.companyDetails.gstin} />
                                                                <InfoRow label="PAN" value={selectedUser.companyDetails.pan} />
                                                                <InfoRow label="TAN" value={selectedUser.companyDetails.tan} />
                                                                <InfoRow label="IEC Code" value={selectedUser.companyDetails.iecCode} />
                                                                <InfoRow label="AD Code" value={selectedUser.companyDetails.adCode} />
                                                            </dl>
                                                        </div>
                                                    ) : <p className="py-4 text-muted-foreground">No company details submitted.</p>}
                                                    <DialogFooter>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="destructive">
                                                                    <X className="mr-2 h-4 w-4" /> Deny
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Are you sure you want to deny this user?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This action will mark the user's verification as 'rejected'. They will be notified but will not be able to use platform features until approved.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleVerification(pUser.id, 'rejected')} className="bg-destructive hover:bg-destructive/90">Confirm Denial</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button className="bg-green-600 hover:bg-green-700">
                                                                    <Check className="mr-2 h-4 w-4" /> Approve
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Are you sure you want to approve this user?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Approving this user will grant them full access to the platform based on their role. This action can be reversed later if needed.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleVerification(pUser.id, 'approved')}>Confirm Approval</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        ) : (
             <div className="border rounded-lg p-12 text-center bg-card dark:bg-card">
                <div className="flex justify-center mb-4">
                    <ShieldCheck className="h-12 w-12 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No Pending Verifications</h2>
                <p className="text-muted-foreground">There are currently no new users awaiting verification.</p>
            </div>
        )}
    </div>
  );
}
