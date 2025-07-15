
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, User, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { doc, getDoc, updateDoc, DocumentData } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";


const PageSkeleton = () => (
    <div className="container max-w-4xl py-6 md:py-10">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid gap-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
    </div>
);


export default function SettingsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<DocumentData | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    // Form States
    const [name, setName] = useState("");
    const [isSavingName, setIsSavingName] = useState(false);
    
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setUserData(data);
                    setName(data.name || "");
                }
                setLoading(false);
            } else {
                router.push("/login");
            }
        });
        return () => unsubscribe();
    }, [router]);
    
    const handleNameUpdate = async () => {
        if (!user || !name) {
            toast({ title: "Error", description: "Name cannot be empty.", variant: "destructive"});
            return;
        }
        setIsSavingName(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { name });
            toast({ title: "Success", description: "Your name has been updated."});
        } catch (error) {
            console.error("Error updating name:", error);
            toast({ title: "Error", description: "Failed to update your name.", variant: "destructive"});
        } finally {
            setIsSavingName(false);
        }
    };

    const handleChangePassword = async () => {
        if (!user) return;
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            toast({ title: "Error", description: "Please fill all password fields.", variant: "destructive"});
            return;
        }
        if (newPassword !== confirmNewPassword) {
            toast({ title: "Error", description: "New passwords do not match.", variant: "destructive"});
            return;
        }
        if (newPassword.length < 6) {
             toast({ title: "Error", description: "Password should be at least 6 characters.", variant: "destructive"});
            return;
        }

        setIsChangingPassword(true);
        try {
            if (user.email) {
                const credential = EmailAuthProvider.credential(user.email, currentPassword);
                await reauthenticateWithCredential(user, credential);
                await updatePassword(user, newPassword);
                
                toast({ title: "Success", description: "Your password has been changed successfully." });
                setCurrentPassword("");
                setNewPassword("");
                setConfirmNewPassword("");
            }
        } catch (error: any) {
            console.error("Error changing password:", error);
            let description = "An error occurred while changing your password.";
            if (error.code === 'auth/wrong-password') {
                description = "The current password you entered is incorrect.";
            }
             toast({ title: "Password Change Failed", description, variant: "destructive"});
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (loading) {
        return <PageSkeleton />;
    }

    return (
        <div className="container max-w-4xl py-6 md:py-10">
            <h1 className="text-2xl sm:text-3xl font-bold font-headline mb-8">Settings</h1>

            <div className="grid gap-8">
                <Card className="bg-white dark:bg-card">
                    <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Manage your personal and company details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid sm:grid-cols-3 items-center gap-4">
                            <Label htmlFor="name">Display Name</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="sm:col-span-2" />
                        </div>
                         <div className="grid sm:grid-cols-3 items-center gap-4">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" value={user?.email || ""} disabled className="sm:col-span-2 bg-secondary" />
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={handleNameUpdate} disabled={isSavingName}>
                                {isSavingName ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                        {userData?.isGstVerified && userData?.companyDetails && (
                            <>
                                <Separator />
                                <div className="space-y-4">
                                     <h3 className="text-lg font-medium">Verified Company Details</h3>
                                     <div className="grid sm:grid-cols-3 items-center gap-4">
                                        <Label>Legal Name</Label>
                                        <p className="sm:col-span-2 text-sm text-muted-foreground">{userData.companyDetails.legalName}</p>
                                    </div>
                                    <div className="grid sm:grid-cols-3 items-center gap-4">
                                        <Label>Address</Label>
                                        <p className="sm:col-span-2 text-sm text-muted-foreground">{userData.companyDetails.address}</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-card">
                    <CardHeader>
                        <CardTitle>Account Security</CardTitle>
                        <CardDescription>Change your password to keep your account secure.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="grid sm:grid-cols-3 items-center gap-4">
                            <Label htmlFor="current-password">Current Password</Label>
                            <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="sm:col-span-2" />
                        </div>
                        <div className="grid sm:grid-cols-3 items-center gap-4">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="sm:col-span-2" />
                        </div>
                        <div className="grid sm:grid-cols-3 items-center gap-4">
                            <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                            <Input id="confirm-new-password" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="sm:col-span-2" />
                        </div>
                         <div className="flex justify-end">
                            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                                 {isChangingPassword ? "Changing..." : "Change Password"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-card">
                    <CardHeader>
                        <CardTitle>User Preferences</CardTitle>
                        <CardDescription>Customize your experience on the platform.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Alert>
                            <Terminal className="h-4 w-4" />
                            <AlertTitle>More Coming Soon!</AlertTitle>
                            <AlertDescription>
                                We're working on adding more customization options, including theme selection and granular notification controls.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

    