
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell } from "lucide-react";

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2 sm:gap-4 flex-col sm:flex-row sm:items-center items-start w-full">
         <Button variant="ghost" size="icon" className="hidden sm:inline-flex relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            <span className="sr-only">Notifications</span>
        </Button>
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {user.email}
        </span>
        <Button variant="ghost" onClick={handleLogout} className="w-full sm:w-auto justify-start">
          Logout
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
       <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
        <Bell className="h-5 w-5" />
        <span className="sr-only">Notifications</span>
      </Button>
      <Button variant="ghost" asChild className="w-full sm:w-auto justify-start">
        <Link href="/login">Log In</Link>
      </Button>
      <Button asChild className="w-full sm:w-auto justify-start">
        <Link href="/signup">Sign Up</Link>
      </Button>
    </div>
  );
}
