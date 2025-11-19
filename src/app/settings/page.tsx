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
          onClick={() => setView(item.id)}
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

  // Form states
  const [name, setName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Fetch user doc + company details
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
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Update name
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
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { name });

      toast({
        title: "Success",
        description: "Your name has been updated.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update your name.",
        variant: "destructive",
      });
    } finally {
      setIsSavingName(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (!user) return;

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
      if (user.email) {
        const cred = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, cred);
        await updatePassword(user, newPassword);

        toast({
          title: "Success",
          description: "Password changed successfully.",
        });

        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }
    } catch (error: any) {
      let message = "Unable to change password.";
      if (error.code === "auth/wrong-password") {
        message = "Incorrect current password.";
      }

      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="container max-w-5xl py-6 md:py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account & preferences.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <SidebarNav activeView={activeView} setView={setActiveView} />
        </div>

        {/* Content */}
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
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="sm:col-span-2"
                  />
                </div>

                <div className="grid sm:grid-cols-3 items-center gap-4">
                  <Label>Email Address</Label>
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

          {/* BUSINESS */}
          {activeView === "business" && (
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Your verified company details.</CardDescription>
              </CardHeader>

              <CardContent>
                {userData?.verificationStatus === "approved" && companyDetails ? (
                  <div className="space-y-4">
                    <Detail label="Legal Name" value={companyDetails.legalName} />

                    {companyDetails.address && (
                      <Detail label="Address" value={companyDetails.address} />
                    )}

                    <Detail
                      label="GSTIN"
                      value={companyDetails.gstin || userData?.gstin}
                    />

                    {/* Exporter Fields */}
                    {userData?.userType === "exporter" && (
                      <>
                        <Detail label="PAN" value={companyDetails.pan} />
                        <Detail
                          label="TAN"
                          value={companyDetails.tan || "Not Provided"}
                        />
                        <Detail
                          label="IEC Code"
                          value={companyDetails.iecCode || "Not Provided"}
                        />
                        <Detail
                          label="AD Code"
                          value={companyDetails.adCode || "Not Provided"}
                        />
                      </>
                    )}

                    {/* Carrier */}
                    {userData?.userType === "carrier" && (
                      <Detail
                        label="License Number"
                        value={companyDetails.licenseNumber}
                      />
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

          {/* PASSWORD */}
          {activeView === "password" && (
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your login password.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <PassField
                  id="current-password"
                  label="Current Password"
                  value={currentPassword}
                  setValue={setCurrentPassword}
                />
                <PassField
                  id="new-password"
                  label="New Password"
                  value={newPassword}
                  setValue={setNewPassword}
                />
                <PassField
                  id="confirm-new-password"
                  label="Confirm New Password"
                  value={confirmNewPassword}
                  setValue={setConfirmNewPassword}
                />

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
                <CardDescription>Customize your dashboard theme.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <Label>Theme</Label>
                <RadioGroup
                  value={theme}
                  onValueChange={setTheme}
                  className="grid grid-cols-3 gap-4"
                >
                  <ThemeOption value="light" icon={<Sun />} label="Light" />
                  <ThemeOption value="dark" icon={<Moon />} label="Dark" />
                  <ThemeOption value="system" icon={<Monitor />} label="System" />
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* BANK */}
          {activeView === "bank" && (
            <ComingSoonCard
              icon={<Landmark className="h-10 w-10" />}
              text="Bank account management is coming soon."
            />
          )}

          {/* REGULATORY */}
          {activeView === "regulatory" && (
            <ComingSoonCard
              icon={<FileText className="h-10 w-10" />}
              text="Regulatory details management is coming soon."
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Reusable Components ---------------- */

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div className="grid sm:grid-cols-3 items-start gap-4">
      <Label>{label}</Label>
      <p className="sm:col-span-2 text-sm text-muted-foreground">{value}</p>
    </div>
  );
}

function PassField({
  id,
  label,
  value,
  setValue,
}: {
  id: string;
  label: string;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <div className="grid sm:grid-cols-3 items-center gap-4">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="sm:col-span-2"
      />
    </div>
  );
}

function ThemeOption({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <RadioGroupItem value={value} id={value} className="peer sr-only" />
      <Label
        htmlFor={value}
        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary"
      >
        {icon}
        {label}
      </Label>
    </div>
  );
}

function ComingSoonCard({ icon, text }: { icon: any; text: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Coming Soon</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
          {icon}
          <p className="text-muted-foreground mt-4">{text}</p>
        </div>
      </CardContent>
    </Card>
  );
}
