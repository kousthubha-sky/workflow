# Stripe Best Practices

> Builtin skill from persistent — covers Stripe payments integration

## Patterns
- Use Stripe Checkout for payment pages — don't build custom payment forms
- Use webhooks to handle payment events — never rely on client-side success redirects
- Always verify webhook signatures with `stripe.webhooks.constructEvent()`
- Use Stripe's idempotency keys for all write operations
- Store Stripe customer ID in your database, linked to your user
- Use Stripe Price objects (not raw amounts) for recurring billing
- Use `metadata` on Stripe objects to link back to your internal records
- Handle all critical webhook events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`
- Use Stripe CLI (`stripe listen`) for local webhook testing
- Keep Stripe secret key server-side only — use publishable key client-side

## Anti-Patterns
- Never log or expose the Stripe secret key
- Don't store credit card numbers — Stripe handles PCI compliance
- Don't trust client-side payment confirmation — always verify via webhooks
- Don't hardcode prices — use Stripe Dashboard or Price API
- Don't skip handling `payment_failed` events — users need to be notified
