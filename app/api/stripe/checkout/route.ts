import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase.from('profiles').select('stripe_customer_id, email').eq('id', user.id).single();

  const origin = process.env.NEXT_PUBLIC_SITE_URL
    ?? `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  let customerId = profile?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${origin}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/upgrade`,
    subscription_data: { metadata: { supabase_user_id: user.id } },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
