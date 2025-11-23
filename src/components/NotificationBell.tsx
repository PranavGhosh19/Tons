
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
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
import { Bell, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, DocumentData, Timestamp } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";

type Notification = DocumentData & {
  id: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: Timestamp;
};

export function NotificationBell() {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
        setNotifications([]);
        return;
    };

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
      setNotifications(list);
    });

    return () => unsubscribe();
  }, [user]);

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.link) {
      router.push(notification.link);
    }
    if (!notification.isRead) {
      const notifRef = doc(db, "notifications", notification.id);
      await updateDoc(notifRef, { isRead: true });
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1.5 flex h-3 w-3">
                <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-primary/80 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 md:w-96" align="end">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length > 0 ? (
          notifications.slice(0, 5).map(notif => (
            <DropdownMenuItem 
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={cn("cursor-pointer flex items-start gap-3 whitespace-normal", !notif.isRead && "font-bold")}
            >
                {!notif.isRead && <span className="h-2 w-2 mt-1.5 rounded-full bg-primary" />}
                 <div className={cn("flex-1", notif.isRead && "pl-5")}>
                    <p>{notif.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true })}
                    </p>
                 </div>
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled className="flex justify-center items-center gap-2 py-4">
            <Info className="h-4 w-4" />
            No new notifications
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
