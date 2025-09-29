"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { User } from "firebase/auth";
import { db, storage } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ExporterVerificationFormProps {
    user: User;
}

export function ExporterVerificationForm({ user }: ExporterVerificationFormProps) {
    const router = useRouter();
    const { toast } = useToast();

    // Form state
    const [companyName, setCompanyName] = useState("");
    const [gst, setGst] = useState("");
    const [pan, setPan] = useState("");
    const [tan, setTan] = useState("");
    const [iecCode, setIecCode] = useState("");
    const [adCode, setAdCode] = useState("");
    const [incorporationCertificate, setIncorporationCertificate] = useState<File | null>(null);
    
    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIncorporationCertificate(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        setIsConfirmOpen(false); // Close confirmation dialog
        if (!companyName || !gst || !pan || !iecCode || !adCode || !incorporationCertificate) {
            toast({ title: "Missing Fields", description: "Please fill out all required fields and upload the incorporation certificate.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);

        try {
            // 1. Upload file to Firebase Storage
            const filePath = `verification-documents/${user.uid}/incorporation-certificate-${Date.now()}`;
            const fileRef = ref(storage, filePath);
            const uploadResult = await uploadBytes(fileRef, incorporationCertificate);
            const downloadUrl = await getDownloadURL(uploadResult.ref);
            
            // 2. Save all data to Firestore
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
                companyDetails: {
                    legalName: companyName,
                    gstin: gst,
                    pan,
                    tan,
                    iecCode,
                    adCode,
                    incorporationCertificateUrl: downloadUrl,
                    incorporationCertificatePath: filePath,
                },
                gstin: gst, // Keep gstin at top level for compatibility
                verificationStatus: 'pending', // Set status to pending
            });

            toast({ title: "Verification Submitted", description: "Your business details have been submitted for review." });
            router.push("/dashboard");

        } catch (error) {
            console.error("Error submitting verification: ", error);
            toast({ title: "Submission Failed", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <>
            <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
                <Card className="mx-auto w-full max-w-2xl shadow-xl">
                    <CardHeader className="text-center space-y-2">
                        <CardTitle className="text-3xl font-bold font-headline">
                            Exporter Business Verification
                        </CardTitle>
                        <CardDescription className="text-base">
                            Please provide your company's details for verification.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="company-name">Name of the Company</Label>
                                <Input id="company-name" value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={isSubmitting} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="gst">GST</Label>
                                <Input id="gst" value={gst} onChange={e => setGst(e.target.value)} disabled={isSubmitting} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="pan">PAN</Label>
                                <Input id="pan" value={pan} onChange={e => setPan(e.target.value)} disabled={isSubmitting} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="tan">TAN (If registered)</Label>
                                <Input id="tan" value={tan} onChange={e => setTan(e.target.value)} disabled={isSubmitting} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="iec">IEC Code</Label>
                                <Input id="iec" value={iecCode} onChange={e => setIecCode(e.target.value)} disabled={isSubmitting} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="ad">AD Code</Label>
                                <Input id="ad" value={adCode} onChange={e => setAdCode(e.target.value)} disabled={isSubmitting} />
                            </div>
                            <div className="grid gap-2 sm:col-span-2">
                                <Label htmlFor="incorporation-cert">Incorporation Certificate</Label>
                                <Input 
                                    id="incorporation-cert" 
                                    type="file" 
                                    onChange={handleFileChange} 
                                    disabled={isSubmitting} 
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                />
                                {incorporationCertificate && <p className="text-sm text-muted-foreground">File selected: {incorporationCertificate.name}</p>}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={() => setIsConfirmOpen(true)} disabled={isSubmitting} className="w-full h-12 text-lg">
                            {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting...</> : 'Submit for Verification'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to submit these details for verification? You will not be able to edit them after submission until the review is complete.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? "Submitting..." : "Confirm & Submit"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
