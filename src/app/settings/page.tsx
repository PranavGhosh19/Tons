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
  Building2, // FIXED
} from "lucide-react";

type SettingsView =
  | "profile"
  | "password"
  | "preferences"
  | "bank"
  | "regulatory"
  | "business";

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
          onClick={() => setView(item.id as SettingsView)}
        >
          <item.icon className="mr-2 h-4 w-4" />
          {item.label}
        </Button>
      ))}
    </nav>
  );
};

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

  // Form States
  const [name, setName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Password States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Load User Data
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
            setCompanyDetails(companySnap.data());
          }
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Update Name
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

      toast({
        title: "Success",
        description: "Your name has been updated.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update name.",
        variant: "destructive",
      });
    }

    setIsSavingName(false);
  };

  // Change Password
  const handleChangePassword = async () => {
    if (!user || !user.email) return;

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
    } catch (error: any) {
      let message = "Failed to change password.";
      if (error.code === "auth/wrong-password")
        message = "Incorrect current password.";

      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }

    setIsChangingPassword(false);
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="container max-w-5xl py-6 md:py-10">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">
        Manage your account and preferences.
      </p>

      <div className="grid md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <SidebarNav activeView={activeView} setView={setActiveView} />
        </div>

        <div className="md:col-span-3">
          {/* PROFILE */}
          {activeView === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Manage your personal details.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-3 items-center gap-4">
                  <Label>Name</Label>
                  <Input
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

          {/* BUSINESS INFO */}
          {activeView === "business" && (
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Verified company details.</CardDescription>
              </CardHeader>

              <CardContent>
                {!userData?.verificationStatus ||
                userData.verificationStatus !== "approved" ? (
                  <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                    <Building2 className="h-10 w-10 mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Your business is not verified yet.
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
                ) : (
                  <div className="space-y-4">
                    <p>
                      <strong>Legal Name:</strong> {companyDetails?.legalName}
                    </p>
                    <p>
                      <strong>GSTIN:</strong>{" "}
                      {userData?.gstin || companyDetails?.gstin}
                    </p>
                    {userData?.userType === "exporter" && (
                      <>
                        <p>
                          <strong>PAN:</strong> {companyDetails?.pan}
                        </p>
                        <p>
                          <strong>IEC Code:</strong> {companyDetails?.iecCode}
                        </p>
                        <p>
                          <strong>AD Code:</strong> {companyDetails?.adCode}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* PASSWORD */}
          {activeView === "password" && (
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password regularly for security.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-3 items-center gap-4">
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="sm:col-span-2"
                  />
                </div>

                <div className="grid sm:grid-cols-3 items-center gap-4">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="sm:col-span-2"
                  />
                </div>

                <div className="grid sm:grid-cols-3 items-center gap-4">
                  <Label>Confirm Password</Label>
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
                <CardDescription>
                  Choose your preferred theme.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <RadioGroup
                  value={theme}
                  onValueChange={setTheme}
                  className="grid grid-cols-3 gap-4"
                >
                  <label htmlFor="light">
                    <RadioGroupItem value="light" id="light" />
                    <div className="flex flex-col items-center mt-2">
                      <Sun />
                      <p>Light</p>
                    </div>
                  </label>

                  <label htmlFor="dark">
                    <RadioGroupItem value="dark" id="dark" />
                    <div className="flex flex-col items-center mt-2">
                      <Moon />
                      <p>Dark</p>
                    </div>
                  </label>

                  <label htmlFor="system">
                    <RadioGroupItem value="system" id="system" />
                    <div className="flex flex-col items-center mt-2">
                      <Monitor />
                      <p>System</p>
                    </div>
                  </label>
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* BANK */}
          {activeView === "bank" && (
            <Card>
              <CardHeader>
                <CardTitle>Bank Account Details</CardTitle>
                <CardDescription>
                  Manage your bank information.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-md">
                  <Landmark className="h-10 w-10 mb-3" />
                  <p className="text-muted-foreground">Coming soon.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* REGULATORY */}
          {activeView === "regulatory" && (
            <Card>
              <CardHeader>
                <CardTitle>Regulatory Details</CardTitle>
                <CardDescription>
                  Manage your compliance documents.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-md">
                  <FileText className="h-10 w-10 mb-3" />
                  <p className="text-muted-foreground">Coming soon.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
