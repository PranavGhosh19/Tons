
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, User, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { doc, getDoc, updateDoc, DocumentData } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Moon, Sun, Monitor, User as UserIcon, Lock, Palette, Landmark, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsView = "profile" | "password" | "preferences" | "bank" | "regulatory";

const PageSkeleton = () => (
    <div className="container max-w-5xl py-6 md:py-10">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
                <Skeleton className="h-48 w-full" />
            </div>
            <div className="md:col-span-3 space-y-8">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    </div>
);

const SidebarNav = ({ activeView, setView }: { activeView: SettingsView, setView: (view: SettingsView) => void }) => {
    const navItems = [
        { id: "profile", label: "Profile Information", icon: UserIcon },
        { id: "password", label: "Password", icon: Lock },
        { id: "preferences", label: "User Preferences", icon: Palette },
        { id: "bank", label: "Bank Account Details", icon: Landmark },
        { id: "regulatory", label: "Regulatory Details", icon: FileText },
    ] as const;

    return (
        <nav className="flex flex-col gap-2">
            {navItems.map(item => (
                <Button
                    key={item.id}
                    variant={activeView === item.id ? "default" : "ghost"}
                    className="justify-start"
                    onClick={() => setView(item.id)}
                >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                </Button>
            ))}
        </nav>
    );
}

export default function SettingsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<DocumentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<SettingsView>("profile");

    const router = useRouter();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();

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
        <div className="container max-w-5xl py-6 md:py-10">
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold font-headline">Settings</h1>
                <p className="text-muted-foreground">Manage your account and preferences.</p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
                <div className="md:col-span-1">
                    <SidebarNav activeView={activeView} setView={setActiveView} />
                </div>
                <div className="md:col-span-3">
                    {activeView === 'profile' && (
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
                                            <div className="grid sm:grid-cols-3 items-start gap-4">
                                                <Label>Legal Name</Label>
                                                <p className="sm:col-span-2 text-sm text-muted-foreground">{userData.companyDetails.legalName}</p>
                                            </div>
                                            {userData.companyDetails.address && (
                                                <div className="grid sm:grid-cols-3 items-start gap-4">
                                                    <Label>Address</Label>
                                                    <p className="sm:col-span-2 text-sm text-muted-foreground">{userData.companyDetails.address}</p>
                                                </div>
                                            )}
                                            <div className="grid sm:grid-cols-3 items-start gap-4">
                                                <Label>GSTIN</Label>
                                                <p className="sm:col-span-2 text-sm text-muted-foreground">{userData.gstin}</p>
                                            </div>
                                            {userData.userType === 'exporter' && (
                                                <>
                                                    <div className="grid sm:grid-cols-3 items-start gap-4">
                                                        <Label>PAN</Label>
                                                        <p className="sm:col-span-2 text-sm text-muted-foreground">{userData.companyDetails.pan}</p>
                                                    </div>
                                                    <div className="grid sm:grid-cols-3 items-start gap-4">
                                                        <Label>TAN</Label>
                                                        <p className="sm:col-span-2 text-sm text-muted-foreground">{userData.companyDetails.tan || 'N/A'}</p>
                                                    </div>
                                                    <div className="grid sm:grid-cols-3 items-start gap-4">
                                                        <Label>IEC Code</Label>
                                                        <p className="sm:col-span-2 text-sm text-muted-foreground">{userData.companyDetails.iecCode}</p>
                                                    </div>
                                                    <div className="grid sm:grid-cols-3 items-start gap-4">
                                                        <Label>AD Code</Label>
                                                        <p className="sm:col-span-2 text-sm text-muted-foreground">{userData.companyDetails.adCode}</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}
                    {activeView === 'password' && (
                         <Card className="bg-white dark:bg-card">
                            <CardHeader>
                                <CardTitle>Change Password</CardTitle>
                                <CardDescription>Update your password to keep your account secure.</CardDescription>
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
                    )}
                    {activeView === 'preferences' && (
                        <Card className="bg-white dark:bg-card">
                            <CardHeader>
                                <CardTitle>User Preferences</CardTitle>
                                <CardDescription>Customize your experience on the platform.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                               <div className="space-y-2">
                                    <Label>Theme</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Select the theme for the dashboard.
                                    </p>
                                </div>
                                <RadioGroup
                                    value={theme}
                                    onValueChange={setTheme}
                                    className="grid grid-cols-3 gap-4"
                                >
                                    <div>
                                        <RadioGroupItem value="light" id="light" className="peer sr-only" />
                                        <Label
                                        htmlFor="light"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                        >
                                        <Sun className="h-6 w-6" />
                                        Light
                                        </Label>
                                    </div>
                                    <div>
                                        <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                                        <Label
                                        htmlFor="dark"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                        >
                                        <Moon className="h-6 w-6" />
                                        Dark
                                        </Label>
                                    </div>
                                    <div>
                                        <RadioGroupItem value="system" id="system" className="peer sr-only" />
                                        <Label
                                        htmlFor="system"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                        >
                                        <Monitor className="h-6 w-6" />
                                        System
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </CardContent>
                        </Card>
                    )}
                    {activeView === 'bank' && (
                        <Card className="bg-white dark:bg-card">
                            <CardHeader>
                                <CardTitle>Bank Account Details</CardTitle>
                                <CardDescription>Manage your bank account for transactions.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                                    <Landmark className="h-10 w-10 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">Bank account management is coming soon.</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {activeView === 'regulatory' && (
                        <Card className="bg-white dark:bg-card">
                            <CardHeader>
                                <CardTitle>Regulatory Details</CardTitle>
                                <CardDescription>Manage your regulatory documents and compliance information.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                                    <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">Regulatory details management is coming soon.</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
