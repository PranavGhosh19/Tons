"use client";

import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import type { User } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RegisterButtonProps {
  shipmentId: string;
  user: User | null;
  onRegisterSuccess: (shipmentId: string) => void;
}

export const RegisterButton: React.FC<RegisterButtonProps> = ({ shipmentId, user, onRegisterSuccess }) => {
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const checkRegistration = async () => {
      setLoading(true);
      try {
        const registerDocRef = doc(db, "shipments", shipmentId, "register", user.uid);
        const registerSnap = await getDoc(registerDocRef);
        setIsRegistered(registerSnap.exists());
      } catch (error) {
        console.error("Error checking registration:", error);
        setIsRegistered(false);
      } finally {
        setLoading(false);
      }
    };
    checkRegistration();
  }, [shipmentId, user]);

  const handleRegister = async () => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to register.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const registerDocRef = doc(db, "shipments", shipmentId, "register", user.uid);
      await setDoc(registerDocRef, {
        carrierId: user.uid,
        registeredAt: Timestamp.now(),
      });
      setIsRegistered(true);
      toast({ title: "Success", description: "You have successfully registered for this shipment." });
      onRegisterSuccess(shipmentId);
    } catch (err) {
      console.error("Error saving registration:", err);
      toast({
        title: "Registration Error",
        description: "Could not save your registration. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <Skeleton className="h-10 w-44" />;

  if (isRegistered) {
    return (
      <Button variant="outline" disabled>
        <Check className="mr-2 h-4 w-4" />
        Registered
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={isSubmitting}>{isSubmitting ? "Processing..." : "I want to Bid"}</Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Registration</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to register to bid on this shipment?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRegister} disabled={isSubmitting}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
