
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, DocumentData, orderBy, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type User = DocumentData & { id: string };

export default function UserManagementPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data()?.userType === 'employee') {
           setUser(currentUser);
        } else {
            router.push('/dashboard');
        }
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);
  
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const usersCollectionRef = collection(db, 'users');
    const q = query(usersCollectionRef, orderBy('name'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
      // Filter out employee accounts from the user management view
      setUsers(usersList.filter(u => u.userType !== 'employee'));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users in real-time: ", error);
      toast({ title: "Error", description: "Could not fetch users.", variant: "destructive" });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (currentTab !== 'all') {
      filtered = filtered.filter(user => user.userType === currentTab);
    }

    if (searchTerm) {
      filtered = filtered.filter(user => 
        (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    return filtered;
  }, [users, currentTab, searchTerm]);

  const renderUserTable = (userData: User[]) => {
    if (userData.length === 0) {
      return (
        <div className="border rounded-lg p-12 text-center bg-card dark:bg-card">
          <h2 className="text-xl font-semibold mb-2">No users found</h2>
          <p className="text-muted-foreground">Try adjusting your search or filter.</p>
        </div>
      );
    }
    return (
       <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">User Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userData.map((u) => (
                <TableRow key={u.id} onClick={() => router.push(`/dashboard/user/${u.id}`)} className="cursor-pointer">
                  <TableCell className="font-medium">{u.name || 'N/A'}</TableCell>
                  <TableCell>{u.email || 'N/A'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={u.userType === 'carrier' ? 'secondary' : 'default'} className="capitalize">
                      {u.userType || 'N/A'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
    );
  }

  if (loading) {
    return (
        <div className="container py-6 md:py-10">
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-12 w-full mb-8" />
            <Skeleton className="h-96 w-full" />
        </div>
    )
  }

  return (
    <div className="container py-6 md:py-10">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">User Management</h1>
      </div>
      <p className="text-muted-foreground mb-8">Oversee all exporter and carrier accounts on the platform.</p>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <div className="flex flex-col sm:flex-row gap-4 mb-6 sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
            <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="all">All Users</TabsTrigger>
                <TabsTrigger value="exporter">Exporters</TabsTrigger>
                <TabsTrigger value="carrier">Carriers</TabsTrigger>
            </TabsList>
        </div>
        <TabsContent value="all">{renderUserTable(filteredUsers)}</TabsContent>
        <TabsContent value="exporter">{renderUserTable(filteredUsers)}</TabsContent>
        <TabsContent value="carrier">{renderUserTable(filteredUsers)}</TabsContent>
      </Tabs>
    </div>
  );
}
