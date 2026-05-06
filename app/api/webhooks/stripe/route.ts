import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerClient } from '@supabase/ssr';
import type Stripe from 'stripe';

const RELEVANT_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
]);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig  = request.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    return NextResponse.json({ error: `Webhook error: ${msg}` }, { status: 400 });
  }

  if (!RELEVANT_EVENTS.has(event.type)) return NextResponse.json({ received: true });

  // Use service role key to bypass RLS in webhook handler
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  if (event.type === 'checkout.session.completed') {
    // Stripe v22: Stripe.Checkout.Session (not Stripe.CheckoutSession)
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === 'subscription' && session.subscription) {
      const userId = session.metadata?.supabase_user_id
        ?? (typeof session.customer === 'string'
          ? ((await stripe.customers.retrieve(session.customer)) as Stripe.Customer).metadata?.supabase_user_id
          : undefined);
      if (userId && typeof session.subscription === 'string') {
        const sub = await stripe.subscriptions.retrieve(session.subscription);
        await upsertSubscription(supabase, userId, sub);
      }
    }
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub      = event.data.object as Stripe.Subscription;
    const customer = (await stripe.customers.retrieve(sub.customer as string)) as Stripe.Customer;
    const userId   = customer.metadata?.supabase_user_id;
    if (userId) await upsertSubscription(supabase, userId, sub);
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    if (typeof invoice.customer === 'string') {
      const customer = (await stripe.customers.retrieve(invoice.customer)) as Stripe.Customer;
      const userId   = customer.metadata?.supabase_user_id;
      if (userId) await supabase.from('profiles').update({ subscription_status: 'past_due' }).eq('id', userId);
    }
  }

  return NextResponse.json({ received: true });
}

async function upsertSubscription(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  sub: Stripe.Subscription
) {
  const isActive  = sub.status === 'active' || sub.status === 'trialing';
  const firstItem = sub.items.data[0];
  const priceId   = firstItem?.price?.id ?? null;
  // In Stripe v22, current_period_start/end are on the subscription item, not the subscription
  const start     = firstItem?.current_period_start
    ? new Date(firstItem.current_period_start * 1000).toISOString()
    : null;
  const end       = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : null;

  await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_subscription_id: sub.id,
    stripe_customer_id: sub.customer as string,
    stripe_price_id: priceId,
    status: sub.status,
    current_period_start: start,
    current_period_end: end,
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_subscription_id' });

  await supabase.from('profiles').update({
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    subscription_period_end: end,
    role: isActive ? 'paid_user' : 'trial_user',
  }).eq('id', userId);
}
