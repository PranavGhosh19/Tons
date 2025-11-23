"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Truck, Gavel, Ship, Bell } from "lucide-react";

type UserType = "carrier" | "exporter" | "employee" | null;

const NavItem = ({ href, icon: Icon, label, isActive, badgeCount }: { href: string, icon: React.ElementType, label: string, isActive: boolean, badgeCount?: number }) => (
    <Link href={href} className={cn(
        "relative flex flex-col items-center justify-center gap-1 w-full h-full rounded-lg transition-colors",
        isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary"
    )}>
        <Icon className="h-6 w-6" />
        <span className="text-xs font-medium">{label}</span>
         {badgeCount !== undefined && badgeCount > 0 && (
            <span className="absolute top-2 right-6 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {badgeCount}
            </span>
        )}
    </Link>
);

const CarrierBottomNav = ({ unreadCount }: { unreadCount: number }) => {
    const pathname = usePathname();
    const carrierLinks = [
        { href: "/dashboard/carrier", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/carrier/find-shipments", label: "Find Shipments", icon: Truck },
        { href: "/dashboard/carrier/my-bids", label: "My Bids", icon: Gavel },
        { href: "/dashboard/notifications", label: "Notifications", icon: Bell, badgeCount: unreadCount },
    ];
    return (
        <div className="flex h-full items-center justify-evenly gap-2">
            {carrierLinks.map(link => {
                 let isActive = false;
                 if (link.href === "/dashboard/carrier") {
                   isActive = pathname === link.href;
                 } else {
                   isActive = pathname.startsWith(link.href);
                 }
                return (
                    <NavItem 
                        key={link.href}
                        href={link.href}
                        icon={link.icon}
                        label={link.label}
                        isActive={isActive}
                        badgeCount={link.badgeCount}
                    />
                )
            })}
        </div>
    );
};

const ExporterBottomNav = ({ unreadCount }: { unreadCount: number }) => {
    const pathname = usePathname();
    const exporterLinks = [
        { href: "/dashboard/exporter", label: "My Shipments", icon: Ship },
        { href: "/dashboard/notifications", label: "Notifications", icon: Bell, badgeCount: unreadCount },
    ];
    return (
        <div className="flex h-full items-center justify-evenly gap-2">
            {exporterLinks.map(link => {
                const isActive = pathname.startsWith(link.href);
                return (
                    <NavItem 
                        key={link.href}
                        href={link.href}
                        icon={link.icon}
                        label={link.label}
                        isActive={isActive}
                        badgeCount={link.badgeCount}
                    />
                )
            })}
        </div>
    );
};


export function BottomBar() {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<UserType>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
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

  useEffect(() => {
    if (!user) {
        setUnreadCount(0);
        return;
    };

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      where("isRead", "==", false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  const hideOnPaths = ["/login", "/signup", "/gst-verification", "/select-type", "/how-it-works", "/support"];
  const isHidden = hideOnPaths.some(path => pathname.startsWith(path)) || pathname === '/';

  if (loading || isHidden) {
    return null;
  }
  
  const renderNavForUser = () => {
      switch(userType) {
          case 'carrier':
              return <CarrierBottomNav unreadCount={unreadCount} />;
          case 'exporter':
              return <ExporterBottomNav unreadCount={unreadCount} />;
          default:
              return null; // No bottom bar for employees or other roles
      }
  }

  // Only render for logged-in users with a specific role nav
  if (!user || !userType || (userType !== 'carrier' && userType !== 'exporter')) {
      return null;
  }

  return (
    <div className="sm:hidden fixed bottom-0 left-0 z-50 w-full h-20 bg-background border-t shadow-[0_-2px_4px_0_rgba(0,0,0,0.05)] p-2">
        {renderNavForUser()}
    </div>
  );
}
