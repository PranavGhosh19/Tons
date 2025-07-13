
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
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

const TEST_GSTIN = "29AAFCS1234H1Z5";

const verifiedData = {
  legalName: "SHIPMENT BATTLEFIELD LOGISTICS PVT LTD",
  tradeName: "Shipment Battlefield",
  status: "Active",
  address: "123, BATTLEFIELD STREET, LOGISTICS CITY, STATE, 560100",
};

export default function GstVerificationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [gstin, setGstin] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/login");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleVerification = async () => {
    if (!gstin) {
      toast({ title: "Error", description: "Please enter a GSTIN.", variant: "destructive" });
      return;
    }
    setIsVerifying(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (gstin.toUpperCase() === TEST_GSTIN) {
      setIsVerified(true);
      toast({ title: "Success", description: "GSTIN verified successfully." });
    } else {
      toast({ title: "Verification Failed", description: "The GSTIN entered is not valid.", variant: "destructive" });
    }
    setIsVerifying(false);
  };
  
  const handleContinue = async () => {
      if (!user) return;
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
            gstin: gstin.toUpperCase(),
            isGstVerified: true,
            companyDetails: verifiedData,
        });
        router.push("/dashboard");
      } catch (error) {
          toast({ title: "Error", description: "Could not save details. Please try again.", variant: "destructive" });
      }
  }

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
            <Skeleton className="h-[450px] w-full max-w-lg" />
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <Card className="mx-auto w-full max-w-lg shadow-xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold font-headline">
            Business Verification
          </CardTitle>
          <CardDescription className="text-base">
            Please enter your company's GSTIN to verify your business.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isVerified ? (
            <div className="p-6 bg-green-50 border-2 border-green-500 rounded-lg">
                <div className="flex items-center gap-3 mb-6">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <h3 className="text-2xl font-bold text-green-800 font-headline">Details Verified</h3>
                </div>
                <div className="space-y-4 text-base">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Legal Name:</span>
                        <span className="font-semibold text-right">{verifiedData.legalName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Trade Name:</span>
                        <span className="font-semibold text-right">{verifiedData.tradeName}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-semibold text-right">{verifiedData.status}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Address:</span>
                        <span className="font-semibold text-right">{verifiedData.address}</span>
                    </div>
                </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  placeholder="e.g., 29AAFCS1234H1Z5"
                  required
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  disabled={isVerifying}
                  className="bg-background h-12 text-lg"
                />
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
            {isVerified ? (
                 <Button onClick={handleContinue} className="w-full h-12 text-lg">
                    Continue to Dashboard
                 </Button>
            ) : (
                <Button onClick={handleVerification} disabled={isVerifying} className="w-full h-12 text-lg">
                    {isVerifying ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</> : 'Verify & Continue'}
                </Button>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}
