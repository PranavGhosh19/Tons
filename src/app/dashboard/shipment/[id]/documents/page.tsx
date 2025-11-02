
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, DocumentData, updateDoc, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, FileText, Anchor, Truck, Building2, User as UserIcon, Phone, Save, PlusCircle, Download, Trash2, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors";
import { Badge } from "@/components/ui/badge";


const InfoCardSkeleton = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
        </CardHeader>
        <CardContent className="space-y-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
        </CardContent>
    </Card>
)

export default function ShipmentDocumentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<DocumentData | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [shipment, setShipment] = useState<DocumentData | null>(null);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // POC Input State
  const [exporterFullName, setExporterFullName] = useState("");
  const [exporterPhoneNumber, setExporterPhoneNumber] = useState("");
  const [isSavingExporter, setIsSavingExporter] = useState(false);

  const [carrierFullName, setCarrierFullName] = useState("");
  const [carrierPhoneNumber, setCarrierPhoneNumber] = useState("");
  const [isSavingCarrier, setIsSavingCarrier] = useState(false);

  // Upload Dialog State
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const shipmentId = params.id as string;

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const uData = userDoc.data();
              setUserData(uData);
              setUserType(uData?.userType || null);
            }
        } else {
            router.push("/login");
        }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!user || !userType || !shipmentId) return;
    
    let unsubShipment: () => void = () => {};
    let unsubContacts: () => void = () => {};

    const setupListeners = async () => {
        setLoading(true);
        const shipmentDocRef = doc(db, "shipments", shipmentId);
        
        unsubShipment = onSnapshot(shipmentDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const shipmentData = docSnap.data();
                const isOwner = shipmentData.exporterId === user.uid;
                const isWinningCarrier = shipmentData.winningCarrierId === user.uid;
                const isEmployee = userType === 'employee';

                if (shipmentData.status === 'awarded' && (isOwner || isWinningCarrier || isEmployee)) {
                    setShipment({ id: docSnap.id, ...shipmentData });

                    // Listen for Contacts Info
                    const contactsDocRef = doc(db, "shipments", shipmentId, "documents", `${shipmentId}-contacts`);
                    unsubContacts = onSnapshot(contactsDocRef, (contactSnap) => {
                        if (contactSnap.exists()) {
                            const contactData = contactSnap.data();
                            setExporterFullName(contactData.exporterFullName || '');
                            setExporterPhoneNumber(contactData.exporterPhoneNumber || '');
                            setCarrierFullName(contactData.carrierFullName || '');
                            setCarrierPhoneNumber(contactData.carrierPhoneNumber || '');
                        }
                    }, async (error) => {
                        const permissionError = new FirestorePermissionError({ path: contactsDocRef.path, operation: 'get' } satisfies SecurityRuleContext);
                        errorEmitter.emit('permission-error', permissionError);
                    });
                } else {
                    toast({ title: "Unauthorized", description: "You don't have permission to view these documents.", variant: "destructive" });
                    router.push(`/dashboard`);
                }
            } else {
                toast({ title: "Error", description: "Shipment not found.", variant: "destructive" });
                router.push("/dashboard");
            }
             setLoading(false);
        }, async (error) => {
            const permissionError = new FirestorePermissionError({ path: shipmentDocRef.path, operation: 'get' } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
            setLoading(false);
        });
    }
    
    setupListeners();

    return () => {
        if (unsubShipment) unsubShipment();
        if (unsubContacts) unsubContacts();
    }

  }, [user, userType, shipmentId, router, toast]);

    useEffect(() => {
        if (!shipmentId) return;

        const documentsQuery = query(collection(db, "shipments", shipmentId, "documents"), orderBy("uploadedAt", "desc"));
        const unsubscribe = onSnapshot(documentsQuery, (querySnapshot) => {
            const docsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDocuments(docsData.filter(d => d.id !== `${shipmentId}-contacts`));
        }, async (error) => {
             const permissionError = new FirestorePermissionError({ path: `shipments/${shipmentId}/documents`, operation: 'list' } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });

        return () => unsubscribe();
    }, [shipmentId, toast]);


  const handlePocUpdate = (pocUserType: 'exporter' | 'carrier') => {
    if (!shipment || !user) return;

    let dataToUpdate;
    let pocStateSetter: React.Dispatch<React.SetStateAction<boolean>>;
    let successMessage: string;

    if (pocUserType === 'exporter') {
        dataToUpdate = { exporterFullName, exporterPhoneNumber };
        pocStateSetter = setIsSavingExporter;
        successMessage = "Exporter's contact details updated.";
    } else {
        dataToUpdate = { carrierFullName, carrierPhoneNumber };
        pocStateSetter = setIsSavingCarrier;
        successMessage = "Carrier's contact details updated.";
    }

    pocStateSetter(true);
    const contactDocRef = doc(db, "shipments", shipment.id, "documents", `${shipment.id}-contacts`);
    
    setDoc(contactDocRef, dataToUpdate, { merge: true }).then(() => {
        toast({ title: "Success", description: successMessage });
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: contactDocRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
        pocStateSetter(false);
    });
  };

  const handleUploadDocument = async () => {
    if (!fileToUpload) {
        toast({ title: "Missing file", description: "Please select a file to upload.", variant: "destructive"});
        return;
    }
    if (!user || !userData || !shipment) return;

    const finalDocumentName = documentName || fileToUpload.name;

    setIsUploading(true);

    try {
        const storagePath = `shipments/${shipment.id}/contacts/${user.uid}/${Date.now()}_${fileToUpload.name}`;
        const storageRef = ref(storage, storagePath);

        const uploadResult = await uploadBytes(storageRef, fileToUpload);
        const downloadUrl = await getDownloadURL(uploadResult.ref);

        const documentsRef = collection(db, "shipments", shipment.id, "documents");
        const newDocumentPayload = {
            name: finalDocumentName,
            url: downloadUrl,
            path: storagePath,
            uploadedBy: user.uid,
            uploaderName: userData.name,
            uploaderType: userData.userType,
            uploadedAt: serverTimestamp(),
            fileType: fileToUpload.type,
        };
        
        const newDocRef = doc(documentsRef);
        setDoc(newDocRef, newDocumentPayload).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: newDocRef.path,
                operation: 'create',
                requestResourceData: newDocumentPayload,
            });
            errorEmitter.emit('permission-error', permissionError);
        });


        toast({ title: "Success", description: "Document uploaded successfully." });
        setDocumentName("");
        setFileToUpload(null);
        setIsUploadDialogOpen(false);

    } catch (error) {
        console.error("Error uploading file:", error);
        toast({ title: "Upload Failed", description: "Could not upload the file. Please check permissions and try again.", variant: "destructive"});
    } finally {
        setIsUploading(false);
    }
  };

    const handleDeleteDocument = async (document: DocumentData) => {
        if (!shipmentId || !document.path) return;
        setDeletingDocId(document.id);
        try {
            // Delete from Storage
            const fileRef = ref(storage, document.path);
            await deleteObject(fileRef);

            // Delete from Firestore
            const docRef = doc(db, "shipments", shipmentId, "documents", document.id);
            await deleteDoc(docRef);

            toast({ title: "Success", description: "Document deleted." });
        } catch (error) {
            console.error("Error deleting document:", error);
            toast({ title: "Error", description: "Failed to delete document.", variant: "destructive" });
        } finally {
            setDeletingDocId(null);
        }
    };


  const handleBackNavigation = () => {
    router.push(`/dashboard/shipment/${shipmentId}`);
  }

  if (loading || !shipment) {
    return (
      <div className="container py-6 md:py-10">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid md:grid-cols-2 gap-8 items-start">
            <InfoCardSkeleton />
            <InfoCardSkeleton />
        </div>
        <Skeleton className="h-64 w-full mt-8" />
      </div>
    );
  }
  
  const canEditExporterInfo = user && (user.uid === shipment.exporterId || userType === 'employee');
  const canEditCarrierInfo = user && (user.uid === shipment.winningCarrierId || userType === 'employee');
  const canUpload = user && (user.uid === shipment.exporterId || user.uid === shipment.winningCarrierId || userType === 'employee');
  const canDelete = (doc: DocumentData) => user && (user.uid === doc.uploadedBy || userType === 'employee');

  return (
    <div className="container py-6 md:py-10">
        <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" onClick={handleBackNavigation} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Shipment
            </Button>
        </div>
        
        <div className="mb-8">
            <h1 className="text-3xl font-bold font-headline">Document Center</h1>
            <p className="text-muted-foreground">Documents and contact information for: {shipment.productName}</p>
        </div>
        
        <Card className="mb-8">
            <CardContent className="p-6 grid md:grid-cols-2 gap-6 md:gap-0">
                <div className="space-y-4 md:pr-6">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><Anchor className="text-primary h-5 w-5"/> Exporter</h3>
                    <p className="font-medium text-sm text-muted-foreground">{shipment?.exporterName}</p>
                    <div className="space-y-2">
                        <Label htmlFor="exporter-poc-name">POC Name</Label>
                        <Input 
                            id="exporter-poc-name" 
                            value={exporterFullName} 
                            onChange={(e) => setExporterFullName(e.target.value)} 
                            placeholder="Enter full name"
                            disabled={!canEditExporterInfo || isSavingExporter}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="exporter-poc-phone">Phone</Label>
                        <Input 
                            id="exporter-poc-phone" 
                            value={exporterPhoneNumber} 
                            onChange={(e) => setExporterPhoneNumber(e.target.value)} 
                            placeholder="Enter phone number"
                            disabled={!canEditExporterInfo || isSavingExporter}
                        />
                    </div>
                    {canEditExporterInfo && (
                        <div className="flex justify-end">
                            <Button size="sm" onClick={() => handlePocUpdate('exporter')} disabled={isSavingExporter}>
                                {isSavingExporter && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save
                            </Button>
                        </div>
                    )}
                </div>

                <div className="relative md:pl-6">
                    <Separator orientation="vertical" className="absolute left-0 top-0 h-full hidden md:block" />
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2"><Truck className="text-primary h-5 w-5"/> Carrier</h3>
                         <p className="font-medium text-sm text-muted-foreground">{shipment?.winningCarrierName}</p>
                         <div className="space-y-2">
                            <Label htmlFor="vendor-poc-name">POC Name</Label>
                            <Input 
                                id="vendor-poc-name" 
                                value={carrierFullName} 
                                onChange={(e) => setCarrierFullName(e.target.value)} 
                                placeholder="Enter full name"
                                disabled={!canEditCarrierInfo || isSavingCarrier}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vendor-poc-phone">Phone</Label>
                            <Input 
                                id="vendor-poc-phone" 
                                value={carrierPhoneNumber} 
                                onChange={(e) => setCarrierPhoneNumber(e.target.value)} 
                                placeholder="Enter phone number"
                                disabled={!canEditCarrierInfo || isSavingCarrier}
                            />
                        </div>
                        {canEditCarrierInfo && (
                            <div className="flex justify-end">
                                <Button size="sm" onClick={() => handlePocUpdate('carrier')} disabled={isSavingCarrier}>
                                    {isSavingCarrier && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle>Shipment Documents</CardTitle>
                </div>
                {canUpload && (
                    <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Upload New Document</DialogTitle>
                                <DialogDescription>
                                    Select a file and provide an optional name.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="doc-name">Document Name (optional)</Label>
                                    <Input id="doc-name" placeholder="Defaults to file name" value={documentName} onChange={e => setDocumentName(e.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="doc-file">File</Label>
                                    <Input id="doc-file" type="file" onChange={e => setFileToUpload(e.target.files ? e.target.files[0] : null)} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)} disabled={isUploading}>Cancel</Button>
                                <Button onClick={handleUploadDocument} disabled={isUploading || !fileToUpload}>
                                    {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isUploading ? 'Uploading...' : 'Upload'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Document</TableHead>
                                <TableHead className="hidden sm:table-cell">Uploaded By</TableHead>
                                <TableHead className="hidden md:table-cell">Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.length > 0 ? (
                                documents.map(doc => (
                                    <TableRow key={doc.id}>
                                        <TableCell className="font-medium">
                                            {doc.name}
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">
                                            <div className="flex flex-col">
                                                <span>{doc.uploaderName}</span>
                                                {doc.uploaderType && <Badge variant="secondary" className="capitalize w-fit">{doc.uploaderType}</Badge>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {doc.uploadedAt ? format(doc.uploadedAt.toDate(), "dd MMM, yyyy") : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                             {canDelete(doc) && (
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteDocument(doc)} disabled={deletingDocId === doc.id}>
                                                    {deletingDocId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" asChild>
                                                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                    <Download className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No documents uploaded yet. Click "Upload" to add your first file.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
