
import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(request: Request) {
    try {
        const { amount, currency, notes } = await request.json();
        
        const instance = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const options = {
            amount: amount,
            currency: currency,
            receipt: `receipt_order_${new Date().getTime()}`,
            notes: notes,
        };

        const order = await instance.orders.create(options);

        if (!order) {
            return NextResponse.json(
                { error: "Could not create order" }, 
                { status: 500 }
            );
        }
        
        return NextResponse.json(order);

    } catch (error: any) {
        console.error("Razorpay API Error:", error);
        return NextResponse.json(
            { error: "Razorpay integration error", details: error.message || "An unknown error occurred" }, 
            { status: 500 }
        );
    }
}
