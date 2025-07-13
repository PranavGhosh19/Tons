
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User as UserIcon, LogOut, Settings, LifeBuoy, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { doc, getDoc } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";

const exporterNavLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/shipment", label: "Shipments" },
  { href: "/dashboard/carrier", label: "Carriers" },
  { href: "/dashboard/analytics", label: "Analytics" },
];

const carrierNavLinks = [
    { href: "/dashboard/carrier", label: "Dashboard" },
    { href: "/dashboard/carrier/shipments", label: "Find Shipments" },
    { href: "/dashboard/carrier/bids", label: "My Bids" },
    { href: "/dashboard/carrier/earnings", label: "Earnings" },
  ];

export function NavLinks() {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserType(userDoc.data()?.userType || null);
        }
      } else {
        setUser(null);
        setUserType(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return null;
  }

  if (!user) {
    return null;
  }

  const links = userType === 'carrier' ? carrierNavLinks : exporterNavLinks;

  return (
    <nav className="hidden sm:flex items-center gap-4 text-sm font-medium">
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "transition-colors hover:text-primary",
              isActive ? "text-primary font-semibold" : "text-muted-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNavLinks() {
    const [user, setUser] = useState<User | null>(null);
    const [userType, setUserType] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();
  
    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserType(userDoc.data()?.userType || null);
          }
        } else {
          setUser(null);
          setUserType(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }, []);
  
    if (loading) {
      return (
          <div className="flex flex-col gap-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
          </div>
      )
    }
  
    if (!user) {
      return null;
    }
  
    const links = userType === 'carrier' ? carrierNavLinks : exporterNavLinks;
  
    return (
        <nav className="flex flex-col items-start gap-4">
        {links.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
            <Link
                key={link.href}
                href={link.href}
                className={cn(
                    "transition-colors hover:text-primary",
                    isActive ? "text-primary font-semibold" : "text-muted-foreground"
                )}
            >
                {link.label}
            </Link>
            );
        })}
        </nav>
    );
  }

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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
      return <Skeleton className="h-10 w-28" />
  }

  if (user) {
    return (
      <div className="flex items-center gap-2 sm:gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user.email ? user.email.charAt(0).toUpperCase() : <UserIcon />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/support')}>
                <LifeBuoy className="mr-2 h-4 w-4" />
                <span>Support</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
      <Button variant="ghost" asChild className="w-full sm:w-auto justify-start sm:justify-center">
        <Link href="/login">Log In</Link>
      </Button>
      <Button asChild className="w-full sm:w-auto justify-start sm:justify-center">
        <Link href="/signup">Sign Up</Link>
      </Button>
    </div>
  );
}

export function MobileMenu() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      });
      return () => unsubscribe();
    }, []);

    if (loading) {
        return <Skeleton className="h-10 w-10 sm:hidden" />;
    }

    if (!user) {
        return null;
    }
    
    return (
        <div className="sm:hidden">
            <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="pt-16">
                <SheetHeader className="text-left">
                    <SheetTitle>Menu</SheetTitle>
                    <SheetDescription className="sr-only">
                        Main navigation menu for Shipping Battlefield.
                    </SheetDescription>
                </SheetHeader>
                <div className="absolute bottom-4 right-4 left-4">
                    <AuthButton />
                </div>
            </SheetContent>
            </Sheet>
        </div>
    );
}
