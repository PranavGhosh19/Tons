import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const amount = body?.amount;
    const currency = body?.currency || "INR";
    const notes = body?.notes || {};

    // validate amount (paise as integer)
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Amount must be a positive integer in paise." },
        { status: 400 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Missing Razorpay server credentials (RAZORPAY_KEY_ID/SECRET).");
      return NextResponse.json(
        { error: "Server misconfiguration: Razorpay credentials missing." },
        { status: 500 }
      );
    }

    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const options = {
      amount,
      currency,
      receipt: `receipt_order_${Date.now()}`,
      notes,
    };

    const order = await instance.orders.create(options);

    if (!order) {
      return NextResponse.json({ error: "Could not create order" }, { status: 500 });
    }

    return NextResponse.json(order);
  } catch (err: any) {
    // Full structured server log for debugging (check terminal)
    console.error("Razorpay API Error:", JSON.stringify(err, null, 2));

    const errorMessage =
      err?.error?.description || err?.description || err?.message || "An unknown Razorpay integration error occurred";

    // Return structured JSON so client can show the real message
    return NextResponse.json({ error: errorMessage, details: err }, { status: 500 });
  }
}
