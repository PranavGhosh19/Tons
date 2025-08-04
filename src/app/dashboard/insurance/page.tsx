
"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck } from "lucide-react";

export default function InsurancePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data()?.userType === 'employee') {
            setUser(currentUser);
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

  if (loading) {
    return (
        <div className="container py-6 md:py-10">
            <Skeleton className="h-8 w-48 mb-8" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
  }

  return (
    <div className="container py-6 md:py-10">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold font-headline">Insurance Management</h1>
        </div>

        <div className="border rounded-lg p-12 text-center bg-card dark:bg-card">
            <div className="flex justify-center mb-4">
                <ShieldCheck className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Insurance Dashboard Coming Soon</h2>
            <p className="text-muted-foreground">This section will contain tools for managing insurance partners and policies. Stay tuned!</p>
        </div>
    </div>
  );
}
