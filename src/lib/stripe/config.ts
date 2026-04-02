import Stripe from "stripe";

// Re-export credit packs for backward compatibility
export { CREDIT_PACKS } from "./credit-packs";

let _stripe: Stripe | null = null;

export function getStripe() {
  if (!_stripe && process.env.STRIPE_SECRET_KEY?.startsWith("sk_")) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: true });
  }
  return _stripe!;
}

// Keep backward compat
export const stripe = null as unknown as Stripe;

