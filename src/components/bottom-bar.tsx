
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { doc, getDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Truck, Gavel } from "lucide-react";

type UserType = "carrier" | "exporter" | "employee" | null;

const NavItem = ({ href, icon: Icon, label, isActive }: { href: string, icon: React.ElementType, label: string, isActive: boolean }) => (
    <Link href={href} className={cn(
        "flex flex-col items-center justify-center gap-1 w-full h-full rounded-lg transition-colors",
        isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary"
    )}>
        <Icon className="h-6 w-6" />
        <span className="text-xs font-medium">{label}</span>
    </Link>
);

const CarrierBottomNav = () => {
    const pathname = usePathname();
    const carrierLinks = [
        { href: "/dashboard/carrier", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/carrier/find-shipments", label: "Find", icon: Truck },
        { href: "/dashboard/carrier/my-bids", label: "My Bids", icon: Gavel },
    ];
    return (
        <div className="flex h-full items-center justify-evenly gap-2">
            {carrierLinks.map(link => (
                <NavItem 
                    key={link.href}
                    href={link.href}
                    icon={link.icon}
                    label={link.label}
                    isActive={pathname.startsWith(link.href)}
                />
            ))}
        </div>
    );
};


export function BottomBar() {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<UserType>(null);
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

  const hideOnPaths = ["/login", "/signup", "/gst-verification", "/select-type"];
  const isHidden = hideOnPaths.some(path => pathname.startsWith(path));

  if (loading || isHidden) {
    return null;
  }
  
  const renderNavForUser = () => {
      switch(userType) {
          case 'carrier':
              return <CarrierBottomNav />;
          // Other user types can be added here
          // case 'exporter':
          //     return <ExporterBottomNav />;
          default:
              return null; // Or some default nav for other roles
      }
  }

  const renderLoggedOutNav = () => (
      <div className="flex h-full items-center justify-evenly gap-2">
        <Button variant="ghost" asChild className="h-12 w-full rounded-full text-base transition-transform hover:scale-105">
          <Link href="/login">Log In</Link>
        </Button>
        <Button asChild className="h-12 w-full rounded-full text-base shadow-lg transition-transform hover:scale-105">
          <Link href="/signup">Sign Up</Link>
        </Button>
      </div>
  )

  return (
    <div className="sm:hidden fixed bottom-0 left-0 z-50 w-full h-20 bg-background border-t shadow-[0_-2px_4px_0_rgba(0,0,0,0.05)] p-2">
        {user ? renderNavForUser() : renderLoggedOutNav()}
    </div>
  );
}
