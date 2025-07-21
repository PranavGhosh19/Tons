
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
import { User as UserIcon, LogOut, Settings, LifeBuoy, Menu, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { doc, getDoc } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Separator } from "./ui/separator";

const exporterNavLinks = [
  { href: "/dashboard/exporter", label: "My Shipments" },
  { href: "/dashboard/analytics", label: "Analytics" },
];

const carrierNavLinks = [
    { href: "/dashboard/carrier", label: "Dashboard" },
    { href: "/dashboard/carrier/find-shipments", label: "Find Shipments" },
];

const employeeNavLinks = [
    { href: "/dashboard/employee", label: "Dashboard" },
    { href: "/dashboard/manage-shipments", label: "Manage Shipments" },
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

  if (loading || !user) {
    return null;
  }

  const getLinks = () => {
    switch (userType) {
        case 'carrier': return carrierNavLinks;
        case 'employee': return employeeNavLinks;
        case 'exporter':
        default: return exporterNavLinks;
    }
  }

  const links = getLinks();

  return (
    <nav className="hidden sm:flex items-center gap-4 text-sm font-medium">
      {links.map((link) => {
        let isActive = false;
        if (link.href === "/dashboard/exporter" || link.href === "/dashboard/carrier" || link.href === "/dashboard/employee") {
          isActive = pathname === link.href;
        } else {
          isActive = pathname.startsWith(link.href);
        }
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
    const router = useRouter();
    const [open, setOpen] = useState(false);


    const handleLogout = async () => {
        try {
          await signOut(auth);
          setOpen(false);
          router.push("/");
        } catch (error) {
          console.error("Error signing out: ", error);
        }
    };
  
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

    const handleLinkClick = (href: string) => {
        router.push(href);
        setOpen(false);
    }
  
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
      return (
        <div className="flex flex-col gap-2 w-full">
            <Button variant="ghost" asChild className="w-full justify-start text-base" onClick={() => setOpen(false)}>
                <Link href="/login">Log In</Link>
            </Button>
            <Button asChild className="w-full justify-start text-base" onClick={() => setOpen(false)}>
                <Link href="/signup">Sign Up</Link>
            </Button>
        </div>
      );
    }
    
    const getLinks = () => {
        switch (userType) {
            case 'carrier': return carrierNavLinks;
            case 'employee': return employeeNavLinks;
            case 'exporter':
            default: return exporterNavLinks;
        }
    }
    const links = getLinks();
  
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="pt-12 flex flex-col">
                <SheetHeader className="text-left">
                    <SheetTitle>Menu</SheetTitle>
                    <SheetDescription className="sr-only">
                        Main navigation menu for Shipping Battlefield.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-3 py-4 text-lg font-medium">
                    {links.map((link) => {
                        let isActive = false;
                        if (link.href === "/dashboard/carrier" || link.href === "/dashboard/exporter" || link.href === "/dashboard/employee") {
                            isActive = pathname === link.href;
                        } else {
                            isActive = pathname.startsWith(link.href);
                        }
                        return (
                        <button
                            key={link.href}
                            onClick={() => handleLinkClick(link.href)}
                            className={cn(
                                "transition-colors hover:text-primary text-left",
                                isActive ? "text-primary font-semibold" : "text-muted-foreground"
                            )}
                        >
                            {link.label}
                        </button>
                        );
                    })}
                </div>

                <div className="mt-auto flex flex-col gap-3 text-lg font-medium">
                    <Separator />
                     {userType === 'employee' && (
                        <button
                            onClick={() => handleLinkClick('/dashboard/employee')}
                            className="transition-colors hover:text-primary text-left text-muted-foreground flex items-center"
                        >
                            <Shield className="mr-2 h-5 w-5" /> Admin Panel
                        </button>
                    )}
                    <button
                        onClick={() => handleLinkClick('/settings')}
                        className="transition-colors hover:text-primary text-left text-muted-foreground flex items-center"
                    >
                         <Settings className="mr-2 h-5 w-5" /> Settings
                    </button>
                     <button
                        onClick={() => handleLinkClick('/support')}
                        className="transition-colors hover:text-primary text-left text-muted-foreground flex items-center"
                    >
                         <LifeBuoy className="mr-2 h-5 w-5" /> Support
                    </button>
                     <button
                        onClick={handleLogout}
                        className="transition-colors hover:text-primary text-left text-muted-foreground flex items-center"
                    >
                         <LogOut className="mr-2 h-5 w-5" /> Logout
                    </button>
                </div>
            </SheetContent>
        </Sheet>
    );
  }

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
                  {userType === 'employee' ? <Shield/> : (user.email ? user.email.charAt(0).toUpperCase() : <UserIcon />)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
             {userType === 'employee' && (
                <DropdownMenuItem onClick={() => router.push('/dashboard/manage-shipments')}>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin Panel</span>
                </DropdownMenuItem>
            )}
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
    
    return (
        <div className="sm:hidden">
            <MobileNavLinks />
        </div>
    );
}
