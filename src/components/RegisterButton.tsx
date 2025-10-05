
"use client";

import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import type { User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';

interface RegisterButtonProps {
  shipmentId: string;
  user: User | null;
  onRegisterSuccess: (shipmentId: string) => void;
}

declare global {
    interface Window {
        Razorpay: any;
    }
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
    };

    const checkRegistration = async () => {
      setLoading(true);
      try {
        const registerDocRef = doc(db, 'shipments', shipmentId, 'register', user.uid);
        const registerSnap = await getDoc(registerDocRef);
        setIsRegistered(registerSnap.exists());
      } catch (error) {
        console.error('Error checking registration:', error);
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
    };
    setIsSubmitting(true);
    
    try {
        // Step 1: Create Razorpay Order
        const response = await fetch('/api/razorpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 100 * 100, currency: 'INR' }) // 100 INR
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create Razorpay order');
        }

        const order = await response.json();
        
        // Step 2: Open Razorpay Checkout
        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency,
            name: "Shipping Battlefield",
            description: `Registration for Shipment #${shipmentId.substring(0, 8)}`,
            order_id: order.id,
            handler: async function (response: any) {
                // Step 3: On successful payment, save registration to Firestore
                try {
                    const registerDocRef = doc(db, 'shipments', shipmentId, 'register', user.uid);
                    await setDoc(registerDocRef, {
                        carrierId: user.uid,
                        registeredAt: Timestamp.now(),
                        paymentId: response.razorpay_payment_id,
                        orderId: response.razorpay_order_id,
                    });
                    setIsRegistered(true);
                    toast({ title: "Success", description: "You have registered your interest for this shipment." });
                    onRegisterSuccess(shipmentId);
                } catch (dbError) {
                    console.error('Error saving registration:', dbError);
                    toast({ title: "Registration Error", description: "Failed to save your registration after payment. Please contact support.", variant: "destructive" });
                }
            },
            prefill: {
                name: user.displayName || '',
                email: user.email || '',
            },
            theme: {
                color: "#1d4ed8"
            }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();

    } catch (error: any) {
        console.error('Error during registration process:', error);
        toast({ 
            title: "Error", 
            description: error.message || "Failed to initiate registration payment.",
            variant: "destructive"
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
    <Button onClick={handleRegister} disabled={isSubmitting}>
        {isSubmitting ? 'Processing...' : 'Pay to Bid (₹100)'}
    </Button>
  );
};
