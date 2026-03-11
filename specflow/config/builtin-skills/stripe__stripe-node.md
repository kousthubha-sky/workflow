# stripe/stripe-node

## setup
```ts
import Stripe from 'stripe'
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})
```

## webhooks (next.js app router)
```ts
// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
export async function POST(req: Request) {
  const body = await req.text()  // must be raw text, not json()
  const sig = headers().get('stripe-signature')!
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch { return new Response('Invalid signature', { status: 400 }) }

  switch (event.type) {
    case 'checkout.session.completed': ...
    case 'customer.subscription.updated': ...
    case 'invoice.payment_failed': ...
  }
  return new Response(null, { status: 200 })
}
```

## checkout
- Always create checkout on server (Server Action or Route Handler)
- Pass `customer_email` or `customer` (existing Stripe customer id) — don't make user re-enter
- Use `metadata` to store your internal user/order ids
- `success_url` and `cancel_url` must be absolute URLs

## subscriptions
- Store: `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `subscriptionStatus` in your DB
- Source of truth: webhook events, not API calls on every request
- Check `subscription.status === 'active' || 'trialing'` for access

## anti-patterns
- Never use client-side Stripe.js to create payment intents directly — always server-side
- Never log or store raw webhook payloads containing card data
- Never skip webhook signature verification
- Don't poll Stripe API for subscription status — use webhooks to sync
