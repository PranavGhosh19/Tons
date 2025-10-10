
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";

interface VerificationFormProps {
    user: User;
    userType: string | null;
}

const FileInput = ({ id, onFileChange, disabled, file }: { id: string, onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void, disabled: boolean, file: File | null }) => (
    <div className="grid gap-2">
        <Label htmlFor={id} className="sr-only">Upload file</Label>
        <Input 
            id={id} 
            type="file" 
            onChange={onFileChange} 
            disabled={disabled} 
            accept=".pdf,.jpg,.jpeg,.png"
            className="text-muted-foreground file:text-primary file:font-semibold"
        />
        {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
    </div>
);


export function ExporterVerificationForm({ user, userType }: VerificationFormProps) {
    const router = useRouter();
    const { toast } = useToast();

    // Text input state
    const [companyName, setCompanyName] = useState("");
    const [gst, setGst] = useState("");
    const [pan, setPan] = useState("");
    const [tan, setTan] = useState("");
    const [iecCode, setIecCode] = useState("");
    const [adCode, setAdCode] = useState("");
    const [licenseNumber, setLicenseNumber] = useState("");
    const [companyType, setCompanyType] = useState("");
    
    // File input state
    const [gstFile, setGstFile] = useState<File | null>(null);
    const [panFile, setPanFile] = useState<File | null>(null);
    const [tanFile, setTanFile] = useState<File | null>(null);
    const [iecCodeFile, setIecCodeFile] = useState<File | null>(null);
    const [adCodeFile, setAdCodeFile] = useState<File | null>(null);
    const [incorporationCertificate, setIncorporationCertificate] = useState<File | null>(null);

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const isExporter = userType === 'exporter';
    const isCarrier = userType === 'carrier';

    const handleFileChange = (setter: React.Dispatch<React.SetStateAction<File | null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setter(e.target.files[0]);
        }
    };

    const uploadFile = async (file: File, docType: string): Promise<{ url: string, path: string }> => {
        const filePath = `verification-documents/${userType}/${user.uid}/${docType}-${file.name}-${Date.now()}`;
        const fileRef = ref(storage, filePath);
        const uploadResult = await uploadBytes(fileRef, file);
        const downloadUrl = await getDownloadURL(uploadResult.ref);
        return { url: downloadUrl, path: filePath };
    };

    const handleSubmit = async () => {
        setIsConfirmOpen(false);
        if (isExporter && (!companyName || !gst || !pan || !iecCode || !adCode || !incorporationCertificate)) {
             toast({ title: "Missing Fields", description: "Please fill out all required text fields and upload all required documents for exporters.", variant: "destructive" });
             return;
        }
        if (isCarrier && (!companyName || !gst || !pan || !licenseNumber || !companyType || !incorporationCertificate)) {
             toast({ title: "Missing Fields", description: "Please fill out all required fields and upload the incorporation certificate for carriers.", variant: "destructive" });
             return;
        }

        setIsSubmitting(true);

        try {
            const companyDetails: any = {
                legalName: companyName,
                gstin: gst,
                pan,
            };

            // Uploads for both
            if (gstFile) companyDetails.gstFileUrl = (await uploadFile(gstFile, 'gst')).url;
            if (panFile) companyDetails.panFileUrl = (await uploadFile(panFile, 'pan')).url;
            if (incorporationCertificate) companyDetails.incorporationCertificateUrl = (await uploadFile(incorporationCertificate, 'incorporation-certificate')).url;

            // Exporter specific fields and uploads
            if (isExporter) {
                companyDetails.tan = tan;
                companyDetails.iecCode = iecCode;
                companyDetails.adCode = adCode;

                if (tanFile) companyDetails.tanFileUrl = (await uploadFile(tanFile, 'tan')).url;
                if (iecCodeFile) companyDetails.iecCodeFileUrl = (await uploadFile(iecCodeFile, 'iec')).url;
                if (adCodeFile) companyDetails.adCodeFileUrl = (await uploadFile(adCodeFile, 'ad')).url;
            }

            // Carrier specific fields
            if (isCarrier) {
                companyDetails.licenseNumber = licenseNumber;
                companyDetails.companyType = companyType;
            }
            
            // Save all data to Firestore
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
                companyDetails,
                gstin: gst, 
                verificationStatus: 'pending',
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
                        <CardTitle className="text-3xl font-bold font-headline capitalize">
                            {userType} Business Verification
                        </CardTitle>
                        <CardDescription className="text-base">
                            Please provide your company's details for verification.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="company-name">Name of the Company</Label>
                            <Input id="company-name" value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={isSubmitting} />
                        </div>
                        
                        <Separator />

                        <div className="grid sm:grid-cols-2 gap-4 items-end">
                             <div className="grid gap-2">
                                <Label htmlFor="gst">GST Number</Label>
                                <Input id="gst" value={gst} onChange={e => setGst(e.target.value)} disabled={isSubmitting} />
                            </div>
                             <FileInput id="gst-file" onFileChange={handleFileChange(setGstFile)} disabled={isSubmitting} file={gstFile} />
                        </div>

                         <div className="grid sm:grid-cols-2 gap-4 items-end">
                            <div className="grid gap-2">
                                <Label htmlFor="pan">PAN</Label>
                                <Input id="pan" value={pan} onChange={e => setPan(e.target.value)} disabled={isSubmitting} />
                            </div>
                            <FileInput id="pan-file" onFileChange={handleFileChange(setPanFile)} disabled={isSubmitting} file={panFile} />
                        </div>


                        {isExporter && (
                            <>
                                <Separator />
                                <div className="grid sm:grid-cols-2 gap-4 items-end">
                                    <div className="grid gap-2">
                                        <Label htmlFor="tan">TAN (If registered)</Label>
                                        <Input id="tan" value={tan} onChange={e => setTan(e.target.value)} disabled={isSubmitting} />
                                    </div>
                                    <FileInput id="tan-file" onFileChange={handleFileChange(setTanFile)} disabled={isSubmitting} file={tanFile} />
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4 items-end">
                                    <div className="grid gap-2">
                                        <Label htmlFor="iec">IEC Code</Label>
                                        <Input id="iec" value={iecCode} onChange={e => setIecCode(e.target.value)} disabled={isSubmitting} />
                                    </div>
                                     <FileInput id="iec-file" onFileChange={handleFileChange(setIecCodeFile)} disabled={isSubmitting} file={iecCodeFile} />
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4 items-end">
                                    <div className="grid gap-2">
                                        <Label htmlFor="ad">AD Code</Label>
                                        <Input id="ad" value={adCode} onChange={e => setAdCode(e.target.value)} disabled={isSubmitting} />
                                    </div>
                                    <FileInput id="ad-file" onFileChange={handleFileChange(setAdCodeFile)} disabled={isSubmitting} file={adCodeFile} />
                                </div>
                                <Separator />
                                <div className="grid sm:grid-cols-2 gap-4 items-end">
                                    <div className="grid gap-2">
                                        <Label>Incorporation Certificate</Label>
                                        <p className="text-xs text-muted-foreground">Required for verification.</p>
                                    </div>
                                    <FileInput id="incorporation-cert-exporter" onFileChange={handleFileChange(setIncorporationCertificate)} disabled={isSubmitting} file={incorporationCertificate} />
                                </div>
                            </>
                        )}
                        {isCarrier && (
                            <>
                                <Separator />
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="license-number">License Number</Label>
                                        <Input id="license-number" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} disabled={isSubmitting} />
                                    </div>
                                     <div className="grid gap-2">
                                        <Label htmlFor="company-type">Company Type</Label>
                                        <Select value={companyType} onValueChange={setCompanyType} disabled={isSubmitting}>
                                            <SelectTrigger id="company-type">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="individual">Individual</SelectItem>
                                                <SelectItem value="company">Company</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                 <Separator />
                                <div className="grid sm:grid-cols-2 gap-4 items-end">
                                  <div className="grid gap-2">
                                    <Label>Incorporation Certificate</Label>
                                    <p className="text-xs text-muted-foreground">Required for verification.</p>
                                  </div>
                                  <FileInput id="incorporation-cert-carrier" onFileChange={handleFileChange(setIncorporationCertificate)} disabled={isSubmitting} file={incorporationCertificate} />
                                </div>
                            </>
                        )}
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
