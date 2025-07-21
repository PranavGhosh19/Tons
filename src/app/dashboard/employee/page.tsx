
"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Truck, Anchor } from "lucide-react";
import Link from "next/link";

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

export default function EmployeeDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [employeeName, setEmployeeName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data()?.userType === 'employee') {
           setUser(currentUser);
           setEmployeeName(userDoc.data()?.name || 'Employee');
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
        </div>
    )
  }

  return (
    <div className="container py-6 md:py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Employee Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {employeeName}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard 
            title="Manage Shipments"
            description="View and manage all active and past shipments."
            href="/dashboard/manage-shipments"
            icon={Truck}
        />
         <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">User Management</CardTitle>
                <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Oversee exporter and carrier accounts.</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Platform Analytics</CardTitle>
                <Anchor className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Access global platform metrics and reports.</p>
            </CardContent>
        </Card>
      </div>

       <div className="mt-12">
            <Card>
                <CardHeader>
                    <CardTitle>Internal Tools</CardTitle>
                    <CardDescription>This area is reserved for internal administrative tools and features.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="border rounded-lg p-12 text-center bg-card-foreground/5 dark:bg-card-foreground/5">
                        <h2 className="text-xl font-semibold mb-2">Feature Under Development</h2>
                        <p className="text-muted-foreground">More employee-specific functionalities are coming soon.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
