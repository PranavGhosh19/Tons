
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Truck } from "lucide-react";

export default function CarrierLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
            router.push('/dashboard');
        }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async () => {
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data()?.userType === 'carrier') {
        router.push("/dashboard");
      } else if (userDoc.exists() && userDoc.data()?.userType !== 'carrier') {
        await auth.signOut();
        toast({
          title: "Login Failed",
          description: "This account is not registered as a carrier.",
          variant: "destructive",
        });
      } else {
        // This case handles users who signed up but didn't select a type
        router.push("/select-type");
      }
      
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12 px-4 bg-primary/10 min-h-[calc(100vh-152px)]">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="text-center space-y-2">
           <div className="flex justify-center">
                <Truck className="h-10 w-10 text-primary"/>
            </div>
          <CardTitle className="text-3xl font-bold font-headline">Carrier Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your carrier dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="bg-secondary"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="#"
                  className="ml-auto inline-block text-sm underline"
                >
                  Forgot your password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="bg-secondary"
              />
            </div>
            <Button onClick={handleLogin} disabled={loading} className="w-full h-12 mt-2 text-lg">
              {loading ? 'Logging in...' : 'Log In'}
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have a carrier account?{" "}
            <Link href="/signup/carrier" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
