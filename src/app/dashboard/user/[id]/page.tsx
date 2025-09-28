
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, DocumentData } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, User as UserIcon, CheckCircle, XCircle, Clock, ShieldAlert } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const PageSkeleton = () => (
    <div className="container max-w-4xl py-6 md:py-10">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
                <Skeleton className="h-48 w-full" />
            </div>
            <div className="md:col-span-2">
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    </div>
);

export default function UserProfilePage() {
    const [user, setUser] = useState<DocumentData | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const userId = params.id as string;

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const adminDocRef = doc(db, 'users', currentUser.uid);
                const adminDoc = await getDoc(adminDocRef);
                if (!adminDoc.exists() || adminDoc.data()?.userType !== 'employee') {
                    toast({ title: "Unauthorized", description: "You don't have permission to view this page.", variant: "destructive" });
                    router.push("/dashboard");
                }
            } else {
                router.push("/login");
            }
        });
        return () => unsubscribe();
    }, [router, toast]);

    useEffect(() => {
        if (!userId) return;

        const fetchUser = async () => {
            setLoading(true);
            try {
                const userDocRef = doc(db, "users", userId);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setUser({ id: userDoc.id, ...userDoc.data() });
                } else {
                    toast({ title: "Not Found", description: "This user does not exist.", variant: "destructive" });
                    router.push("/dashboard/user-management");
                }
            } catch (error) {
                toast({ title: "Error", description: "Failed to fetch user details.", variant: "destructive" });
                console.error("Error fetching user: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [userId, router, toast]);
    
    const getStatusInfo = (status: string | undefined): { text: string; icon: React.ElementType, variant: "success" | "secondary" | "destructive" | "outline" | "default" } => {
        switch (status) {
            case 'approved':
                return { text: 'Approved', icon: CheckCircle, variant: 'success' };
            case 'pending':
                return { text: 'Pending', icon: Clock, variant: 'secondary' };
            case 'rejected':
                return { text: 'Rejected', icon: XCircle, variant: 'destructive' };
            case 'unsubmitted':
                 return { text: 'Unsubmitted', icon: ShieldAlert, variant: 'outline' };
            default:
                return { text: 'Unknown', icon: ShieldAlert, variant: 'outline' };
        }
    }


    if (loading) {
        return <PageSkeleton />;
    }

    if (!user) {
        return null; // Or a more specific "not found" component
    }

    const statusInfo = getStatusInfo(user.verificationStatus);

    return (
        <div className="container max-w-4xl py-6 md:py-10">
            <div className="mb-6">
                <Button variant="ghost" onClick={() => router.push('/dashboard/user-management')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to User Management
                </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-start">
                <div className="md:col-span-1">
                    <Card>
                        <CardContent className="pt-6 flex flex-col items-center text-center">
                            <Avatar className="h-24 w-24 mb-4">
                                <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                                    {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon />}
                                </AvatarFallback>
                            </Avatar>
                            <h2 className="text-2xl font-bold font-headline">{user.name}</h2>
                            <p className="text-muted-foreground">{user.email}</p>
                            <Badge variant={user.userType === 'carrier' ? 'secondary' : 'default'} className="capitalize mt-4">
                                {user.userType || 'N/A'}
                            </Badge>
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Details</CardTitle>
                            <CardDescription>Key information about the user's account and verification status.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Verification Status</span>
                                <Badge variant={statusInfo.variant} className="capitalize">
                                    <statusInfo.icon className="mr-2 h-4 w-4" />
                                    {statusInfo.text}
                                </Badge>
                            </div>
                            
                            {user.companyDetails && (
                                <>
                                    <Separator />
                                    <div className="space-y-4">
                                        <h3 className="font-semibold">Company Information</h3>
                                        <dl className="text-sm space-y-2">
                                            <div className="grid grid-cols-3 gap-4"><dt className="text-muted-foreground col-span-1">Legal Name</dt><dd className="col-span-2 font-medium">{user.companyDetails.legalName}</dd></div>
                                            {user.companyDetails.tradeName && <div className="grid grid-cols-3 gap-4"><dt className="text-muted-foreground col-span-1">Trade Name</dt><dd className="col-span-2 font-medium">{user.companyDetails.tradeName}</dd></div>}
                                            {user.companyDetails.address && <div className="grid grid-cols-3 gap-4"><dt className="text-muted-foreground col-span-1">Address</dt><dd className="col-span-2 font-medium">{user.companyDetails.address}</dd></div>}
                                            <div className="grid grid-cols-3 gap-4"><dt className="text-muted-foreground col-span-1">GSTIN</dt><dd className="col-span-2 font-medium">{user.gstin}</dd></div>

                                            {user.userType === 'exporter' && (
                                                <>
                                                    <div className="grid grid-cols-3 gap-4"><dt className="text-muted-foreground col-span-1">PAN</dt><dd className="col-span-2 font-medium">{user.companyDetails.pan}</dd></div>
                                                    <div className="grid grid-cols-3 gap-4"><dt className="text-muted-foreground col-span-1">TAN</dt><dd className="col-span-2 font-medium">{user.companyDetails.tan || 'N/A'}</dd></div>
                                                    <div className="grid grid-cols-3 gap-4"><dt className="text-muted-foreground col-span-1">IEC Code</dt><dd className="col-span-2 font-medium">{user.companyDetails.iecCode}</dd></div>
                                                    <div className="grid grid-cols-3 gap-4"><dt className="text-muted-foreground col-span-1">AD Code</dt><dd className="col-span-2 font-medium">{user.companyDetails.adCode}</dd></div>
                                                </>
                                            )}
                                        </dl>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
