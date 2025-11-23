
"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, DocumentData, orderBy, doc, getDoc, onSnapshot, where, Timestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Notification = DocumentData & {
  id: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: Timestamp;
};

export default function NotificationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
      setNotifications(list);
      setLoading(false);
      
      // Mark all as read when the page is loaded
      markAllAsRead(snapshot.docs);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      toast({ title: "Error", description: "Failed to load notifications.", variant: "destructive" });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const markAllAsRead = async (docs: DocumentData[]) => {
      const unreadDocs = docs.filter(doc => !doc.data().isRead);
      if (unreadDocs.length > 0) {
          const batch = writeBatch(db);
          unreadDocs.forEach(doc => {
              batch.update(doc.ref, { isRead: true });
          });
          await batch.commit();
      }
  };
  
  const handleNotificationClick = (notification: Notification) => {
    if (notification.link) {
      router.push(notification.link);
    }
  };

  if (loading) {
    return (
      <div className="container py-6 md:py-10">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 md:py-10">
       <div className="flex items-center mb-8 gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="sm:hidden">
          <ArrowLeft />
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Notifications</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          {notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "p-4 flex items-start gap-4 transition-colors cursor-pointer",
                    notif.isRead ? "hover:bg-secondary/50" : "bg-primary/10 hover:bg-primary/20",
                  )}
                >
                    <div className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", !notif.isRead && "bg-primary")} />
                    <div className="flex-1">
                        <p className={cn("text-sm", !notif.isRead && "font-semibold")}>
                          {notif.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true })}
                        </p>
                    </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold">No Notifications</h2>
                <p className="text-muted-foreground">You're all caught up!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
