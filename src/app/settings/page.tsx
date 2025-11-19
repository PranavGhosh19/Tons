"use client";

import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  User,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  DocumentData,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Moon,
  Sun,
  Monitor,
  User as UserIcon,
  Lock,
  Palette,
  Landmark,
  FileText,
  Building2,
} from "lucide-react";

type SettingsView =
  | "profile"
  | "business"
  | "password"
  | "preferences"
  | "bank"
  | "regulatory";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<DocumentData | null>(null);
  const [companyDetails, setCompanyDetails] = useState<DocumentData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<SettingsView>("profile");

  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  // Profile form
  const [name, setName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Company form states (support fields you specified)
  const [legalName, setLegalName] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [address, setAddress] = useState("");
  // Exporter fields
  const [tan, setTan] = useState("");
  const [iecCode, setIecCode] = useState("");
  const [adCode, setAdCode] = useState("");
  // Carrier field
  const [licenseNumber, setLicenseNumber] = useState("");

  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Skeleton loader component
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

  // Sidebar nav
  const SidebarNav = ({
    activeView,
    setView,
  }: {
    activeView: SettingsView;
    setView: (v: SettingsView) => void;
  }) => {
    const navItems = [
      { id: "profile", label: "Profile Information", icon: UserIcon },
      { id: "business", label: "Business Information", icon: Building2 },
      { id: "password", label: "Password", icon: Lock },
      { id: "preferences", label: "User Preferences", icon: Palette },
      { id: "bank", label: "Bank Account Details", icon: Landmark },
      { id: "regulatory", label: "Regulatory Details", icon: FileText },
    ] as const;

    return (
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
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
  };

  // Load user and related data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);

      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserData(data);
          setName(data.name || "");
          setGstin(data.gstin || "");

          // fetch companyDetails from users/{uid}/companyDetails/{uid}
          const companyRef = doc(
            db,
            "users",
            currentUser.uid,
            "companyDetails",
            currentUser.uid
          );
          const companySnap = await getDoc(companyRef);
          if (companySnap.exists()) {
            const cd = companySnap.data();
            setCompanyDetails(cd);
            // populate company form fields
            setLegalName(cd.legalName || "");
            setGstin(cd.gstin || data.gstin || "");
            setPan(cd.pan || "");
            setAddress(cd.address || "");
            setTan(cd.tan || "");
            setIecCode(cd.iecCode || "");
            setAdCode(cd.adCode || "");
            setLicenseNumber(cd.licenseNumber || "");
          }
        }
      } catch (err) {
        console.error("Error loading user data:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save display name
  const handleNameUpdate = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingName(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { name: name.trim() });
      toast({ title: "Success", description: "Name updated." });
      // reflect locally
      setUserData((prev) => ({ ...(prev || {}), name: name.trim() }));
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Unable to update name.",
        variant: "destructive",
      });
    } finally {
      setIsSavingName(false);
    }
  };

  // Save company details (writes to users/{uid}/companyDetails/{uid} and updates users/{uid}.gstin)
  const handleSaveCompany = async () => {
    if (!user) return;

    // basic validation: legalName and gstin should exist (gstin optional depending on your rules)
    if (!legalName.trim()) {
      toast({
        title: "Error",
        description: "Legal name is required.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingCompany(true);

    try {
      const companyRef = doc(
        db,
        "users",
        user.uid,
        "companyDetails",
        user.uid
      );

      const payload: Record<string, any> = {
        legalName: legalName.trim(),
        gstin: gstin.trim() || null,
        pan: pan.trim() || null,
        address: address.trim() || null,
      };

      // exporter-only fields
      if (userData?.role === "exporter") {
        payload.tan = tan.trim() || null;
        payload.iecCode = iecCode.trim() || null;
        payload.adCode = adCode.trim() || null;
      }

      // carrier-only field
      if (userData?.role === "carrier") {
        payload.licenseNumber = licenseNumber.trim() || null;
      }

      // write company details (merge)
      await setDoc(companyRef, payload, { merge: true });

      // also update root user doc's gstin if present
      if (gstin?.trim()) {
        await updateDoc(doc(db, "users", user.uid), { gstin: gstin.trim() });
      }

      toast({ title: "Success", description: "Company details saved." });

      // reflect locally
      setCompanyDetails((prev) => ({ ...(prev || {}), ...payload }));
    } catch (err) {
      console.error("Error saving company details:", err);
      toast({
        title: "Error",
        description: "Could not save company details.",
        variant: "destructive",
      });
    } finally {
      setIsSavingCompany(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (!user || !user.email) return;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({
        title: "Error",
        description: "Please fill all password fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      toast({ title: "Success", description: "Password changed." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      console.error("Password change error:", err);
      toast({
        title: "Error",
        description:
          err?.code === "auth/wrong-password"
            ? "Current password is incorrect."
            : "Could not change password.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Optional: quick logout button handler (handy while testing)
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
      toast({
        title: "Error",
        description: "Could not log out.",
        variant: "destructive",
      });
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="container max-w-5xl py-6 md:py-10">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account and preferences.
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <SidebarNav activeView={activeView} setView={setActiveView} />
          <div className="mt-6">
            <Button variant="ghost" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="md:col-span-3 space-y-6">
          {/* PROFILE */}
          {activeView === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Manage your personal details.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-3 items-center gap-4">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="sm:col-span-2"
                  />
                </div>

                <div className="grid sm:grid-cols-3 items-center gap-4">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user?.email || ""}
                    disabled
                    className="sm:col-span-2 bg-secondary"
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleNameUpdate} disabled={isSavingName}>
                    {isSavingName ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* BUSINESS */}
          {activeView === "business" && (
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>
                  Provide your legal & tax details. Fields shown depend on role.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 items-center gap-4">
                  <Label>Role</Label>
                  <Input
                    value={userData?.role || "employee"}
                    disabled
                    className="sm:col-span-2 bg-secondary"
                  />
                </div>

                <div className="grid sm:grid-cols-3 items-center gap-4">
                  <Label htmlFor="legalName">Legal Name</Label>
                  <Input
                    id="legalName"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="sm:col-span-2"
                  />
                </div>

                <div className="grid sm:grid-cols-3 items-center gap-4">
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="sm:col-span-2"
                  />
                </div>

                <div className="grid sm:grid-cols-3 items-center gap-4">
                  <Label htmlFor="pan">PAN</Label>
                  <Input
                    id="pan"
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                    className="sm:col-span-2"
                  />
                </div>

                <div className="grid sm:grid-cols-3 items-start gap-4">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="sm:col-span-2"
                  />
                </div>

                {/* Exporter-specific */}
                {userData?.role === "exporter" && (
                  <>
                    <div className="grid sm:grid-cols-3 items-center gap-4">
                      <Label htmlFor="tan">TAN</Label>
                      <Input
                        id="tan"
                        value={tan}
                        onChange={(e) => setTan(e.target.value)}
                        className="sm:col-span-2"
                      />
                    </div>

                    <div className="grid sm:grid-cols-3 items-center gap-4">
                      <Label htmlFor="iecCode">IEC Code</Label>
                      <Input
                        id="iecCode"
                        value={iecCode}
                        onChange={(e) => setIecCode(e.target.value)}
                        className="sm:col-span-2"
                      />
                    </div>

                    <div className="grid sm:grid-cols-3 items-center gap-4">
                      <Label htmlFor="adCode">AD Code</Label>
                      <Input
                        id="adCode"
                        value={adCode}
                        onChange={(e) => setAdCode(e.target.value)}
                        className="sm:col-span-2"
                      />
                    </div>
                  </>
                )}

                {/* Carrier-specific */}
                {userData?.role === "carrier" && (
                  <div className="grid sm:grid-cols-3 items-center gap-4">
                    <Label htmlFor="licenseNumber">License Number</Label>
                    <Input
                      id="licenseNumber"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      className="sm:col-span-2"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      // revert to loaded values
                      setLegalName(companyDetails?.legalName || "");
                      setGstin(companyDetails?.gstin || userData?.gstin || "");
                      setPan(companyDetails?.pan || "");
                      setAddress(companyDetails?.address || "");
                      setTan(companyDetails?.tan || "");
                      setIecCode(companyDetails?.iecCode || "");
                      setAdCode(companyDetails?.adCode || "");
                      setLicenseNumber(companyDetails?.licenseNumber || "");
                      toast({ title: "Reverted", description: "Changes reverted." });
                    }}
                  >
                    Revert
                  </Button>

                  <Button onClick={handleSaveCompany} disabled={isSavingCompany}>
                    {isSavingCompany ? "Saving..." : "Save Company Details"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* PASSWORD */}
          {activeView === "password" && (
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-3 gap-4">
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="sm:col-span-2"
                  />
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="sm:col-span-2"
                  />
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="sm:col-span-2"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? "Changing..." : "Change Password"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* PREFERENCES */}
          {activeView === "preferences" && (
            <Card>
              <CardHeader>
                <CardTitle>User Preferences</CardTitle>
                <CardDescription>Customize your experience.</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Select your preferred theme.
                  </p>
                </div>

                <RadioGroup
                  value={theme as string}
                  onValueChange={(val) => setTheme(val)}
                  className="grid grid-cols-3 gap-4"
                >
                  <div>
                    <RadioGroupItem
                      value="light"
                      id="light"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="light"
                      className="flex flex-col items-center p-4 border rounded-md cursor-pointer peer-data-[state=checked]:border-primary"
                    >
                      <Sun className="h-6 w-6" />
                      Light
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                    <Label
                      htmlFor="dark"
                      className="flex flex-col items-center p-4 border rounded-md cursor-pointer peer-data-[state=checked]:border-primary"
                    >
                      <Moon className="h-6 w-6" />
                      Dark
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem value="system" id="system" className="peer sr-only" />
                    <Label
                      htmlFor="system"
                      className="flex flex-col items-center p-4 border rounded-md cursor-pointer peer-data-[state=checked]:border-primary"
                    >
                      <Monitor className="h-6 w-6" />
                      System
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* BANK */}
          {activeView === "bank" && (
            <Card>
              <CardHeader>
                <CardTitle>Bank Account Details</CardTitle>
                <CardDescription>Manage bank details (coming soon).</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                  <Landmark className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Bank account management is coming soon.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* REGULATORY */}
          {activeView === "regulatory" && (
            <Card>
              <CardHeader>
                <CardTitle>Regulatory Details</CardTitle>
                <CardDescription>Compliance documents & uploads (coming soon).</CardDescription>
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
