
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ExporterVerificationForm } from "@/components/exporter-verification-form";

const PageSkeleton = () => (
     <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
        <Skeleton className="h-[450px] w-full max-w-lg" />
    </div>
)

export default function GstVerificationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.verificationStatus && data.verificationStatus !== 'unsubmitted') {
            router.push('/dashboard');
          } else {
            setUserType(data.userType);
            setLoading(false);
          }
        } else {
           setLoading(false);
        }
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);


  if (loading || !user) {
    return <PageSkeleton />;
  }

  // Both exporters and carriers will now use the same detailed verification form.
  return <ExporterVerificationForm user={user} userType={userType} />
}
