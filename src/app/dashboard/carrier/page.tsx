
"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { RecentActivities } from "@/components/RecentActivities";

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

const VerificationStatus = ({ userData }: { userData: DocumentData | null }) => {
    const status = userData?.verificationStatus;
    if (status === 'pending') {
        return (
            <Card className="bg-yellow-50 dark:bg-card border-yellow-400 dark:border-yellow-600">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><ShieldAlert className="text-yellow-600"/>Verification Pending</CardTitle>
                    <CardDescription className="dark:text-yellow-500">
                        Your business details are currently under review. You will be notified once the verification is complete. You cannot bid on shipments until your account is approved.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }
    if (status === 'rejected') {
         return (
            <Card className="bg-red-50 dark:bg-card border-red-400 dark:border-red-600">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><ShieldAlert className="text-red-600"/>Verification Denied</CardTitle>
                    <CardDescription className="dark:text-red-500">
                       Your verification request was not approved. Please review your details in Settings and contact support if you believe this is an error.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }
    return null;
  }


export default function CarrierDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const uData = userDoc.data();
          if (uData.userType === 'carrier') {
            setUser(currentUser);
            setUserData(uData);
          } else {
            router.push('/dashboard');
          }
        } else {
           router.push('/login');
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);
  
  if (loading || !user) {
    return (
        <div className="container py-6 md:py-10">
            <div className="flex justify-between items-center mb-8">
                <Skeleton className="h-10 w-64" />
            </div>
            <div className="mt-12">
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    )
  }

  const isApproved = userData?.verificationStatus === 'approved';
  const carrierName = userData?.name || 'Anonymous Carrier';

  return (
    <div className="container py-6 md:py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Welcome, {carrierName}</h1>
      </div>

       {!isApproved && <div className="mb-8"><VerificationStatus userData={userData} /></div>}

       {isApproved ? (
            <div className="mt-12">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Shipments you have registered an interest in bidding on.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <RecentActivities />
                    </CardContent>
                </Card>
            </div>
       ) : (
            <Card className="mt-12">
                <CardHeader>
                    <CardTitle>Account Under Review</CardTitle>
                    <CardDescription>Your dashboard will become active once your verification is approved.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="text-center text-muted-foreground py-12">
                        <p>Thank you for submitting your details.</p>
                        <p className="text-sm">You can view your submitted information in <Link href="/settings" className="underline hover:text-primary">Settings</Link>.</p>
                    </div>
                </CardContent>
            </Card>
       )}
    </div>
  );
}
