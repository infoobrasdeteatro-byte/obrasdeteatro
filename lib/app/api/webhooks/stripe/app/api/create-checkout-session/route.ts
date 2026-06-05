import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

const PLANES = {
  premium: process.env.STRIPE_PRICE_PREMIUM_ID,
  destacado: process.env.STRIPE_PRICE_DESTACADO_ID,
  empresas: process.env.STRIPE_PRICE_EMPRESAS_ID,
};

export async function POST(req: NextRequest) {
  try {
    const { plan, userId, email } = await req.json();

    const priceId = PLANES[plan as keyof typeof PLANES];
    if (!priceId) {
      return NextResponse.json({ error: 'Plan no válido' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId, plan },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/precios?cancelled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Error creando sesión de checkout:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
