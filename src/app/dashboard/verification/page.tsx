
"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, DocumentData, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Check, X, Eye, FileText } from "lucide-react";
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
  AlertDialogTrigger,
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
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function VerificationPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pendingUsers, setPendingUsers] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<DocumentData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
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
          setIsDialogOpen(false);
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

  const handleOpenPreview = (url: string | undefined) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: "No Document",
        description: "There is no document available to preview for this item.",
        variant: "destructive"
      });
    }
  }
  
  const handleViewDetails = async (pUser: DocumentData) => {
    try {
      const companyDetailsRef = doc(db, "users", pUser.id, "companyDetails", pUser.id);
      const companyDetailsSnap = await getDoc(companyDetailsRef);
      const companyDetails = companyDetailsSnap.exists() ? companyDetailsSnap.data() : null;
      setSelectedUser({ ...pUser, companyDetails });
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Error fetching company details:", error);
      toast({
        title: "Error",
        description: "Failed to load company details.",
        variant: "destructive",
      });
    }
  };


  if (loading) {
    return (
        <div className="container py-6 md:py-10">
            <Skeleton className="h-8 w-48 mb-8" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
  }
  
  const InfoRow = ({ label, value, onPreviewClick, hasDocument }: { label: string, value?: string | null, onPreviewClick?: () => void, hasDocument?: boolean }) => (
    <div className="flex items-center justify-between border-b py-3">
      <div>
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="font-semibold text-left">{value || 'N/A'}</dd>
      </div>
      {hasDocument && onPreviewClick && (
          <Button variant="ghost" size="sm" onClick={onPreviewClick}>
              <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
      )}
    </div>
  )

  return (
    <>
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
                                            <Button variant="outline" size="sm" onClick={() => handleViewDetails(pUser)}>
                                                <Eye className="mr-2 h-4 w-4" /> View Details
                                            </Button>
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
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Verification Details</DialogTitle>
                <DialogDescription>
                    Review the information submitted by {selectedUser?.name}.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-6 -mr-6">
                {selectedUser?.companyDetails ? (
                    <div className="py-4 space-y-4">
                        <dl className="space-y-1">
                            <InfoRow label="Legal Name" value={selectedUser.companyDetails.legalName} />
                            <InfoRow 
                                label="GST" 
                                value={selectedUser.companyDetails.gstin} 
                                hasDocument={!!selectedUser.companyDetails.gstFileUrl}
                                onPreviewClick={() => handleOpenPreview(selectedUser.companyDetails.gstFileUrl)}
                            />
                            <InfoRow 
                                label="PAN" 
                                value={selectedUser.companyDetails.pan}
                                hasDocument={!!selectedUser.companyDetails.panFileUrl}
                                onPreviewClick={() => handleOpenPreview(selectedUser.companyDetails.panFileUrl)}
                            />
                            {selectedUser.userType === 'exporter' ? (
                                <>
                                    <InfoRow 
                                        label="TAN" 
                                        value={selectedUser.companyDetails.tan}
                                        hasDocument={!!selectedUser.companyDetails.tanFileUrl}
                                        onPreviewClick={() => handleOpenPreview(selectedUser.companyDetails.tanFileUrl)}
                                    />
                                    <InfoRow 
                                        label="IEC Code" 
                                        value={selectedUser.companyDetails.iecCode}
                                        hasDocument={!!selectedUser.companyDetails.iecCodeFileUrl}
                                        onPreviewClick={() => handleOpenPreview(selectedUser.companyDetails.iecCodeFileUrl)}
                                    />
                                    <InfoRow 
                                        label="AD Code" 
                                        value={selectedUser.companyDetails.adCode}
                                        hasDocument={!!selectedUser.companyDetails.adCodeFileUrl}
                                        onPreviewClick={() => handleOpenPreview(selectedUser.companyDetails.adCodeFileUrl)}
                                    />
                                </>
                            ) : (
                                <>
                                    <InfoRow 
                                        label="License Number" 
                                        value={selectedUser.companyDetails.licenseNumber}
                                        hasDocument={!!selectedUser.companyDetails.licenseFileUrl}
                                        onPreviewClick={() => handleOpenPreview(selectedUser.companyDetails.licenseFileUrl)}
                                    />
                                    <InfoRow label="Company Type" value={selectedUser.companyDetails.companyType} />
                                </>
                            )}
                        </dl>
                        <Separator />
                        <InfoRow 
                            label="Incorporation Certificate" 
                            hasDocument={!!selectedUser.companyDetails.incorporationCertificateUrl}
                            onPreviewClick={() => handleOpenPreview(selectedUser.companyDetails.incorporationCertificateUrl)}
                        />
                    </div>
                ) : <p className="py-4 text-muted-foreground">No company details submitted.</p>}
            </ScrollArea>
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
                            <AlertDialogAction onClick={() => selectedUser && handleVerification(selectedUser.id, 'rejected')} className="bg-destructive hover:bg-destructive/90">Confirm Denial</AlertDialogAction>
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
                            <AlertDialogAction onClick={() => selectedUser && handleVerification(selectedUser.id, 'approved')}>Confirm Approval</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
