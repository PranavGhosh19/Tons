"use client";

import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  User,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { doc, getDoc, updateDoc, DocumentData } from "firebase/firestore";
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

// ------------------ Skeleton Loader ------------------
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

// ------------------ Sidebar ------------------
const SidebarNav = ({
  activeView,
  setView,
}: {
  activeView: SettingsView;
  setView: (view: SettingsView) => void;
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

// ------------------ Main Page ------------------
export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<DocumentData | null>(null);
  const [companyDetails, setCompanyDetails] = useState<DocumentData | null>(null);
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

  // ------------------ Fetch User + User Data ------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          setName(data.name || "");

          // ------------------ UPDATED COMPANY DETAILS FETCH ------------------
          if (data.verificationStatus === "approved") {
            const companyRef = doc(
              db,
              "users",
              currentUser.uid,
              "companyDetails",
              currentUser.uid
            );
            const companySnap = await getDoc(companyRef);

            if (companySnap.exists()) {
              const company = companySnap.data();

              // Ensure all fields always exist
              setCompanyDetails({
                legalName: company.legalName || "",
                gstin: company.gstin || "",
                pan: company.pan || "",
                address: company.address || "",

                // Exporter-only
                tan: company.tan || "",
                iecCode: company.iecCode || "",
                adCode: company.adCode || "",

                // Carrier-only
                licenseNumber: company.licenseNumber || "",
              });
            }
          }
        }

        setLoading(false);
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // ------------------ Update Name ------------------
  const handleNameUpdate = async () => {
    if (!user || !name.trim()) {
      toast({
        title: "Error",
        description: "Name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingName(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { name });
      toast({ title: "Success", description: "Name updated." });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update name.",
        variant: "destructive",
      });
    } finally {
      setIsSavingName(false);
    }
  };

  // ------------------ Change Password ------------------
  const handleChangePassword = async () => {
    if (!user) return;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({
        title: "Error",
        description: "Please fill all fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
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
      if (user.email) {
        const credential = EmailAuthProvider.credential(
          user.email,
          currentPassword
        );
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);

        toast({
          title: "Success",
          description: "Password updated successfully.",
        });

        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }
    } catch (err: any) {
      toast({
        title: "Password Change Failed",
        description:
          err.code === "auth/wrong-password"
            ? "Incorrect current password."
            : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ------------------ Render ------------------
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
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          {/* ----------- PROFILE ----------- */}
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
                  <Label>Email</Label>
                  <Input
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

          {/* ----------- BUSINESS INFO ----------- */}
          {activeView === "business" && (
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Verified company details.</CardDescription>
              </CardHeader>
              <CardContent>
                {userData?.verificationStatus === "approved" && companyDetails ? (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-3 gap-4">
                      <Label>Legal Name</Label>
                      <p className="sm:col-span-2 text-sm text-muted-foreground">
                        {companyDetails.legalName}
                      </p>
                    </div>

                    {companyDetails.address && (
                      <div className="grid sm:grid-cols-3 gap-4">
                        <Label>Address</Label>
                        <p className="sm:col-span-2 text-sm text-muted-foreground">
                          {companyDetails.address}
                        </p>
                      </div>
                    )}

                    <div className="grid sm:grid-cols-3 gap-4">
                      <Label>GSTIN</Label>
                      <p className="sm:col-span-2 text-sm text-muted-foreground">
                        {companyDetails.gstin}
                      </p>
                    </div>

                    {userData?.userType === "exporter" && (
                      <>
                        <div className="grid sm:grid-cols-3 gap-4">
                          <Label>PAN</Label>
                          <p className="sm:col-span-2 text-sm text-muted-foreground">
                            {companyDetails.pan}
                          </p>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4">
                          <Label>TAN</Label>
                          <p className="sm:col-span-2 text-sm text-muted-foreground">
                            {companyDetails.tan || "N/A"}
                          </p>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4">
                          <Label>IEC Code</Label>
                          <p className="sm:col-span-2 text-sm text-muted-foreground">
                            {companyDetails.iecCode}
                          </p>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4">
                          <Label>AD Code</Label>
                          <p className="sm:col-span-2 text-sm text-muted-foreground">
                            {companyDetails.adCode}
                          </p>
                        </div>
                      </>
                    )}

                    {userData?.userType === "carrier" && (
                      <div className="grid sm:grid-cols-3 gap-4">
                        <Label>License No.</Label>
                        <p className="sm:col-span-2 text-sm text-muted-foreground">
                          {companyDetails.licenseNumber}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                    <Building2 className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Your business information is not yet verified.
                    </p>
                    {userData?.verificationStatus === "unsubmitted" && (
                      <Button
                        variant="link"
                        onClick={() => router.push("/gst-verification")}
                      >
                        Complete Verification
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ----------- PASSWORD ----------- */}
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

          {/* ----------- PREFERENCES ----------- */}
          {activeView === "preferences" && (
            <Card>
              <CardHeader>
                <CardTitle>User Preferences</CardTitle>
                <CardDescription>Customize your experience.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Label>Theme</Label>
                <RadioGroup
                  value={theme}
                  onValueChange={setTheme}
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
                    <RadioGroupItem
                      value="dark"
                      id="dark"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="dark"
                      className="flex flex-col items-center p-4 border rounded-md cursor-pointer peer-data-[state=checked]:border-primary"
                    >
                      <Moon className="h-6 w-6" />
                      Dark
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem
                      value="system"
                      id="system"
                      className="peer sr-only"
                    />
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

          {/* ----------- BANK ----------- */}
          {activeView === "bank" && (
            <Card>
              <CardHeader>
                <CardTitle>Bank Account Details</CardTitle>
                <CardDescription>
                  Manage your payment bank details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                  <Landmark className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Bank account management is coming soon.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ----------- REGULATORY ----------- */}
          {activeView === "regulatory" && (
            <Card>
              <CardHeader>
                <CardTitle>Regulatory Details</CardTitle>
                <CardDescription>
                  Upload and manage compliance documents.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                  <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Regulatory details management is coming soon.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
