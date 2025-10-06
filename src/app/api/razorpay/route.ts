// This file is intentionally left blank after removing Razorpay logic.
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    return NextResponse.json(
        { error: "Payment gateway is not configured." },
        { status: 501 }
    );
}
