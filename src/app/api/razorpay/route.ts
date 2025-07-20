
import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(request: Request) {
    try {
        const { amount, currency, notes } = await request.json();
        
        if (!amount || !currency) {
            return NextResponse.json({ error: "Amount and currency are required" }, { status: 400 });
        }

        const razorpay = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });

        const options = {
            amount: amount, // amount in the smallest currency unit
            currency: currency,
            receipt: `receipt_${Date.now()}`,
            notes: notes || {},
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json(order, { status: 200 });

    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        return NextResponse.json({ error: "Failed to create Razorpay order" }, { status: 500 });
    }
}
