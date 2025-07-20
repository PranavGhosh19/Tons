
"use client";

import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Check, Wallet } from 'lucide-react';
import type { User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
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
} from "@/components/ui/alert-dialog"

declare global {
    interface Window {
      Razorpay: any;
    }
}

interface RegisterButtonProps {
  shipmentId: string;
  user: User | null;
  onRegisterSuccess: (shipmentId: string) => void;
}

export const RegisterButton: React.FC<RegisterButtonProps> = ({ shipmentId, user, onRegisterSuccess }) => {
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
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

  const handlePayment = async () => {
    setIsConfirmOpen(false);
    if (!user) {
        toast({ title: "Error", description: "You must be logged in to register.", variant: "destructive" });
        return;
    };
    setIsSubmitting(true);
    
    // Step 1: Create Razorpay Order
    try {
        const response = await fetch('/api/razorpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                amount: 550 * 100, // 550 INR in paise
                currency: 'INR',
                notes: {
                    shipmentId: shipmentId,
                    userId: user.uid,
                    type: 'carrier_registration_fee'
                }
            }),
        });
        
        const order = await response.json();
        
        if (!response.ok) {
            throw new Error(order.error || 'Failed to create payment order.');
        }

        // Step 2: Open Razorpay Checkout
        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_YOUR_KEY_ID",
            amount: order.amount,
            currency: order.currency,
            name: "Shipment Battlefield",
            description: "Shipment Bid Registration Fee",
            order_id: order.id,
            config: {
              display: {
                blocks: {
                  upi: {
                    name: 'Pay with UPI',
                    instruments: [
                      { method: 'upi' },
                    ],
                  },
                  wallets: {
                    name: 'Pay with Wallets',
                    instruments: [
                      { method: 'wallet' },
                    ],
                  },
                  cards: {
                    name: 'Pay with Cards',
                    instruments: [
                      { method: 'card' },
                    ]
                  },
                  netbanking: {
                    name: 'Pay with Netbanking',
                    instruments: [
                      { method: 'netbanking' },
                    ],
                  }
                },
                sequence: ['block.upi', 'block.cards', 'block.wallets', 'block.netbanking'],
                preferences: {
                  show_default_blocks: false,
                },
              },
            },
            handler: async function (response: any) {
                // Step 3: On successful payment, register the user
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
                } catch (error) {
                     console.error('Error saving registration:', error);
                     toast({ title: "Registration Error", description: "Payment was successful, but failed to save your registration. Please contact support.", variant: "destructive" });
                }
            },
            prefill: {
                name: user.displayName || "Carrier User",
                email: user.email || "",
            },
            notes: {
                address: "Shipment Battlefield Corporate Office"
            },
            theme: {
                "color": "#3399cc"
            }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response: any){
            toast({
                title: "Payment Failed",
                description: response.error.description || "Something went wrong.",
                variant: "destructive"
            });
        });
        rzp.open();

    } catch (error: any) {
        console.error('Error during payment process:', error);
        toast({ title: "Error", description: error.message || "Failed to initiate payment.", variant: "destructive" });
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
    <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogTrigger asChild>
            <Button disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : 'I want to Bid (₹550)'}
            </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                    <Wallet className="h-6 w-6 text-primary" />
                    Registration Fee Details
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                    <div className="space-y-4 pt-4 text-left text-foreground">
                       <p>To maintain fairness and accountability on the platform, a registration fee is required to participate in this bid.</p>
                       <ul className="list-disc list-inside space-y-2 text-sm bg-secondary p-4 rounded-lg">
                           <li><span className="font-bold">₹50</span> is a one-time, non-refundable registration fee for this bid.</li>
                           <li><span className="font-bold">₹500</span> is a refundable security deposit.</li>
                       </ul>
                       <p className="text-sm text-muted-foreground">
                            If you win the bid, your security deposit will be refunded after successful completion of the service. However, if you fail to deliver or become unresponsive, the deposit will be forfeited as a penalty.
                       </p>
                    </div>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handlePayment}>Proceed to Payment</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
  );
};
