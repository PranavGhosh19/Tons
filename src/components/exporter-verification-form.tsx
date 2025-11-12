
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { User } from "firebase/auth";
import { db, storage, auth } from "@/lib/firebase";

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
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";

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


export function ExporterVerificationForm({ user }: { user: User }) {
    const router = useRouter();
    const { toast } = useToast();
    const [userType, setUserType] = useState<"exporter" | "carrier" | null>(null);

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
    const [licenseFile, setLicenseFile] = useState<File | null>(null);
    const [incorporationCertificate, setIncorporationCertificate] = useState<File | null>(null);

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    useEffect(() => {
        const fetchUserType = async () => {
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setUserType(userDoc.data().userType);
                }
            }
        };
        fetchUserType();
    }, [user]);

    const isExporter = userType === 'exporter';
    const isCarrier = userType === 'carrier';

    const handleFileChange = (setter: React.Dispatch<React.SetStateAction<File | null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setter(e.target.files[0]);
        }
    };

    const uploadFile = async (file: File, docType: string): Promise<{ url: string, path: string }> => {
        if (!user) throw new Error("User not authenticated for file upload.");
        const filePath = `verification-documents/${userType}/${user.uid}/${docType}-${file.name}-${Date.now()}`;
        const fileRef = ref(storage, filePath);
        const uploadResult = await uploadBytes(fileRef, file);
        const downloadUrl = await getDownloadURL(uploadResult.ref);
        return { url: downloadUrl, path: filePath };
    };

    const handleSubmit = async () => {
        setIsConfirmOpen(false);
        if (!user) {
             toast({ title: "Error", description: "You must be logged in to submit.", variant: "destructive" });
             return;
        }

        if (isExporter && (!companyName || !gst || !pan || !iecCode || !adCode || !incorporationCertificate)) {
             toast({ title: "Missing Fields", description: "Please fill out all required text fields and upload the incorporation certificate.", variant: "destructive" });
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
                pan,
                gstin: gst,
                verificationStatus: 'pending', // Add status directly to subcollection doc
            };

            if (gstFile) {
              const gstUpload = await uploadFile(gstFile, 'gst');
              companyDetails.gstFileUrl = gstUpload.url;
              companyDetails.gstFilePath = gstUpload.path;
            }
            if (panFile) {
              const panUpload = await uploadFile(panFile, 'pan');
              companyDetails.panFileUrl = panUpload.url;
              companyDetails.panFilePath = panUpload.path;
            }
            if (incorporationCertificate) {
              const incUpload = await uploadFile(incorporationCertificate, 'incorporation-certificate');
              companyDetails.incorporationCertificateUrl = incUpload.url;
              companyDetails.incorporationCertificatePath = incUpload.path;
            }

            if (isExporter) {
                companyDetails.tan = tan;
                companyDetails.iecCode = iecCode;
                companyDetails.adCode = adCode;

                if (tanFile) {
                    const tanUpload = await uploadFile(tanFile, 'tan');
                    companyDetails.tanFileUrl = tanUpload.url;
                    companyDetails.tanFilePath = tanUpload.path;
                }
                if (iecCodeFile) {
                    const iecUpload = await uploadFile(iecCodeFile, 'iec');
                    companyDetails.iecCodeFileUrl = iecUpload.url;
                    companyDetails.iecCodeFilePath = iecUpload.path;
                }
                if (adCodeFile) {
                    const adUpload = await uploadFile(adCodeFile, 'ad');
                    companyDetails.adCodeFileUrl = adUpload.url;
                    companyDetails.adCodeFilePath = adUpload.path;
                }
            }

            if (isCarrier) {
                companyDetails.licenseNumber = licenseNumber;
                companyDetails.companyType = companyType;
                if (licenseFile) {
                  const licenseUpload = await uploadFile(licenseFile, 'license');
                  companyDetails.licenseFileUrl = licenseUpload.url;
                  companyDetails.licenseFilePath = licenseUpload.path;
                }
            }
            
            // Create a new document in the companyDetails subcollection
            const companyDetailsRef = doc(collection(db, "users", user.uid, "companyDetails"));
            
            setDoc(companyDetailsRef, companyDetails).catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: companyDetailsRef.path,
                    operation: 'create',
                    requestResourceData: companyDetails,
                });
                errorEmitter.emit('permission-error', permissionError);
                 // We throw the original error so it's still logged if not caught by the overlay
                throw serverError;
            });

            // No longer need to update the main user document with the status
            
            toast({ title: "Verification Submitted", description: "Your business details have been submitted for review." });
            router.push("/dashboard");

        } catch (error) {
            console.error("Error submitting verification: ", error);
            // This will catch errors from file upload or the final user doc update
            // but not from the setDoc with the error emitter.
            if (!(error instanceof FirestorePermissionError)) {
                 toast({ title: "Submission Failed", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
            }
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
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Company Details</h3>
                            <div className="grid gap-2">
                                <Label htmlFor="company-name">Name of the Company</Label>
                                <Input id="company-name" value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={isSubmitting} />
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Tax Information</h3>
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
                                <div className="grid sm:grid-cols-2 gap-4 items-end">
                                    <div className="grid gap-2">
                                        <Label htmlFor="tan">TAN (If registered)</Label>
                                        <Input id="tan" value={tan} onChange={e => setTan(e.target.value)} disabled={isSubmitting} />
                                    </div>
                                    <FileInput id="tan-file" onFileChange={handleFileChange(setTanFile)} disabled={isSubmitting} file={tanFile} />
                                </div>
                            )}
                        </div>

                        {isExporter && (
                            <>
                                <Separator />
                                <div className="space-y-4">
                                     <h3 className="text-lg font-medium">Import/Export Codes</h3>
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
                                </div>
                            </>
                        )}
                        
                        {isCarrier && (
                            <>
                                <Separator />
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Carrier Details</h3>
                                    <div className="grid sm:grid-cols-2 gap-4 items-end">
                                        <div className="grid gap-2">
                                            <Label htmlFor="license-number">License Number</Label>
                                            <Input id="license-number" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} disabled={isSubmitting} />
                                        </div>
                                        <FileInput id="license-file" onFileChange={handleFileChange(setLicenseFile)} disabled={isSubmitting} file={licenseFile} />
                                    </div>
                                     <div className="grid sm:grid-cols-2 gap-4">
                                         <div className="grid gap-2">
                                            <Label htmlFor="company-type">Company Type</Label>
                                            <Select value={companyType} onValueChange={setCompanyType} disabled={isSubmitting}>
                                                <SelectTrigger id="company-type">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="individual">Individual</SelectItem>
                                                    <SelectItem value="company">Company</SelectItem>
                                                    <SelectItem value="overseas">Overseas</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <Separator />
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Incorporation Certificate</h3>
                            <FileInput id="incorporation-cert" onFileChange={handleFileChange(setIncorporationCertificate)} disabled={isSubmitting} file={incorporationCertificate} />
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
