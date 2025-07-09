
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data()?.userType) {
          const { userType } = userDoc.data();
          if (userType === 'exporter') {
            router.replace('/dashboard/exporter');
          } else if (userType === 'carrier') {
            router.replace('/dashboard/carrier');
          } else {
            router.replace('/select-type');
          }
        } else {
          router.replace('/select-type');
        }
      } else {
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="container py-10">
        <div className="flex justify-between items-center mb-8">
            <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-80 w-full rounded-lg" />
    </div>
  );
}
