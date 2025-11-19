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

// -------------- Skeleton ----------------
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

// -------------- Sidebar ----------------
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

// -------------- MAIN PAGE ----------------
export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<DocumentData | null>(null);
  const [companyDetails, setCompanyDetails] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<SettingsView>("profile");

  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  // Form states
  const [name, setName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // ---------------- FETCH USER + COMPANY DETAILS ----------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);

      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserData(data);
        setName(data.name || "");

        // ------------ Fetch company details if verified -----------
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

            setCompanyDetails({
              legalName: company.legalName || "",
              gstin: company.gstin || "",
              pan: company.pan || "",            // ⭐ PAN Included ⭐
              address: company.address || "",

              // Exporter
              tan: company.tan || "",
              iecCode: company.iecCode || "",
              adCode: company.adCode || "",

              // Carrier
              licenseNumber: company.licenseNumber || "",
            });
          }
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // ---------------- UPDATE NAME ----------------
  const handleNameUpdate = async () => {
    if (!user || !name.trim()) return;

    setIsSavingName(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { name });
      toast({ title: "Success", description: "Name updated." });
    } catch {
      toast({ title: "Error", description: "Update failed", variant: "destructive" });
    }
    setIsSavingName(false);
  };

  // ---------------- CHANGE PASSWORD ----------------
  const handleChangePassword = async () => {
    if (!user) return;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({
        title: "Error",
        description: "All fields required",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Error",
        description: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      if (user.email) {
        await reauthenticateWithCredential(
          user,
          EmailAuthProvider.credential(user.email, currentPassword)
        );

        await updatePassword(user, newPassword);

        toast({ title: "Success", description: "Password changed" });
      }
    } catch {
      toast({
        title: "Failed",
        description: "Incorrect password",
        variant: "destructive",
      });
    }

    setIsChangingPassword(false);
  };

  // ---------------- RENDER ----------------
  if (loading) return <PageSkeleton />;

  return (
    <div className="container max-w-5xl py-6 md:py-10">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">
        Manage your account and preferences.
      </p>

      <div className="grid md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <SidebarNav activeView={activeView} setView={setActiveView} />
        </div>

        <div className="md:col-span-3">
          {/* ---------------- PROFILE ---------------- */}
          {activeView === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="col-span-2"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled className="col-span-2" />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleNameUpdate}>
                    {isSavingName ? "Saving..." : "Save"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ---------------- BUSINESS INFO ---------------- */}
          {activeView === "business" && (
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Verified company details.</CardDescription>
              </CardHeader>
              <CardContent>
                {!companyDetails ? (
                  <p>Your business is not verified.</p>
                ) : (
                  <div className="space-y-4">
                    {/* Legal Name */}
                    <div className="grid grid-cols-3 gap-4">
                      <Label>Legal Name</Label>
                      <p className="col-span-2 text-muted-foreground">
                        {companyDetails.legalName}
                      </p>
                    </div>

                    {/* Address */}
                    {companyDetails.address && (
                      <div className="grid grid-cols-3 gap-4">
                        <Label>Address</Label>
                        <p className="col-span-2 text-muted-foreground">
                          {companyDetails.address}
                        </p>
                      </div>
                    )}

                    {/* GSTIN */}
                    <div className="grid grid-cols-3 gap-4">
                      <Label>GSTIN</Label>
                      <p className="col-span-2 text-muted-foreground">
                        {companyDetails.gstin}
                      </p>
                    </div>

                    {/* PAN ⭐ */}
                    <div className="grid grid-cols-3 gap-4">
                      <Label>PAN</Label>
                      <p className="col-span-2 text-muted-foreground">
                        {companyDetails.pan}
                      </p>
                    </div>

                    {/* Exporter Fields */}
                    {userData?.userType === "exporter" && (
                      <>
                        <div className="grid grid-cols-3 gap-4">
                          <Label>TAN</Label>
                          <p className="col-span-2 text-muted-foreground">
                            {companyDetails.tan}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <Label>IEC Code</Label>
                          <p className="col-span-2 text-muted-foreground">
                            {companyDetails.iecCode}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <Label>AD Code</Label>
                          <p className="col-span-2 text-muted-foreground">
                            {companyDetails.adCode}
                          </p>
                        </div>
                      </>
                    )}

                    {/* Carrier Field */}
                    {userData?.userType === "carrier" && (
                      <div className="grid grid-cols-3 gap-4">
                        <Label>License No.</Label>
                        <p className="col-span-2 text-muted-foreground">
                          {companyDetails.licenseNumber}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ---------------- PASSWORD ---------------- */}
          {activeView === "password" && (
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="col-span-2"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="col-span-2"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Label>Confirm Password</Label>
                  <Input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="col-span-2"
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleChangePassword}>
                    {isChangingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ---------------- PREFERENCES ---------------- */}
          {activeView === "preferences" && (
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={theme} onValueChange={setTheme}>
                  <div className="flex gap-4">
                    <Label className="flex items-center gap-2">
                      <RadioGroupItem value="light" />
                      Light
                    </Label>
                    <Label className="flex items-center gap-2">
                      <RadioGroupItem value="dark" />
                      Dark
                    </Label>
                    <Label className="flex items-center gap-2">
                      <RadioGroupItem value="system" />
                      System
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* ---------------- BANK ---------------- */}
          {activeView === "bank" && (
            <Card>
              <CardHeader>
                <CardTitle>Bank Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Coming soon.</p>
              </CardContent>
            </Card>
          )}

          {/* ---------------- REGULATORY ---------------- */}
          {activeView === "regulatory" && (
            <Card>
              <CardHeader>
                <CardTitle>Regulatory Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Coming soon.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
