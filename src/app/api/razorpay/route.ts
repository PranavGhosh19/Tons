
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { randomBytes } from 'crypto';

export async function POST(request: Request) {
  const { amount, currency } = await request.json();

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret || keyId === 'YOUR_KEY_ID' || keySecret === 'YOUR_KEY_SECRET') {
    console.error('Razorpay keys are not configured in .env file');
    return NextResponse.json(
      { error: 'Payment gateway is not configured. Please contact support.' },
      { status: 500 }
    );
  }

  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  const options = {
    amount: amount,
    currency: currency,
    receipt: `receipt_order_${randomBytes(8).toString('hex')}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    return NextResponse.json(order);
  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create Razorpay order' },
      { status: 500 }
    );
  }
}
