
"use client";

import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import type { User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';

declare global {
    interface Window {
      Razorpay: any;
    }
}

interface RegisterButtonProps {
  shipmentId: string;
  user: User | null;
  onRegisterSuccess: () => void;
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
                  banks: {
                    name: 'All payment methods',
                    instruments: [
                      {
                          method: 'upi'
                      },
                      {
                          method: 'card'
                      },
                      {
                          method: 'wallet'
                      },
                      {
                          method: 'netbanking'
                      }
                    ],
                  },
                },
                sequence: ['block.banks'],
                preferences: {
                  show_default_blocks: true,
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
                    onRegisterSuccess();
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

  if (loading) return <Skeleton className="h-10 w-32" />;

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
        {isSubmitting ? 'Processing...' : 'I want to Bid (₹550)'}
    </Button>
  );
};
