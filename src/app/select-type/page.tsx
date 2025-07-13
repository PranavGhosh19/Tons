
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";
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
import { useToast } from "@/hooks/use-toast";
import { Truck, Anchor, Ship } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

type UserType = "carrier" | "exporter";

export default function SelectTypePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Check if user already has a type selected
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data()?.userType) {
          router.push("/dashboard");
        } else {
          setLoading(false);
        }
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleContinue = async () => {
    if (!selectedType) {
      toast({
        title: "Error",
        description: "Please select a user type.",
        variant: "destructive",
      });
      return;
    }
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        userType: selectedType,
      });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: "Could not save your user type. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-primary/10 p-4">
            <Skeleton className="h-96 w-full max-w-2xl" />
        </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-secondary p-4">
      <Card className="mx-auto w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold font-headline">
            One Last Step!
          </CardTitle>
          <CardDescription className="text-lg">
            Tell us who you are to personalize your experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div
              className={cn(
                "rounded-lg border-2 p-6 text-center cursor-pointer hover:border-primary transition-colors flex flex-col items-center justify-center h-48",
                selectedType === "carrier" ? "border-primary bg-primary/5" : "border-border"
              )}
              onClick={() => setSelectedType("carrier")}
            >
              <Truck className="w-12 h-12 mb-4 text-primary" />
              <h3 className="text-xl font-bold mb-2 font-headline">Carrier Provider</h3>
              <p className="text-muted-foreground">
                I own/operate vehicles and want to bid on shipments.
              </p>
            </div>
            <div
              className={cn(
                "rounded-lg border-2 p-6 text-center cursor-pointer hover:border-primary transition-colors flex flex-col items-center justify-center h-48",
                selectedType === "exporter" ? "border-primary bg-primary/5" : "border-border"
              )}
              onClick={() => setSelectedType("exporter")}
            >
              <Anchor className="w-12 h-12 mb-4 text-primary" />
              <h3 className="text-xl font-bold mb-2 font-headline">Exporter</h3>
              <p className="text-muted-foreground">
                I need to ship goods and want to receive bids.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleContinue}
            disabled={!selectedType || isSubmitting}
            className="w-full h-12 text-lg"
          >
            {isSubmitting ? 'Saving...' : 'Continue'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
