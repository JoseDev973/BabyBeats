import Stripe from "stripe";

export const stripe = process.env.STRIPE_SECRET_KEY?.startsWith("sk_")
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: true })
  : (null as unknown as Stripe);

export const CREDIT_PACKS = {
  starter: {
    name: "Starter",
    credits: 3,
    price: 4.99,
    pricePerSong: 1.66,
    priceId: process.env.STRIPE_STARTER_PACK_PRICE_ID!,
    popular: false,
  },
  popular: {
    name: "Family Pack",
    credits: 10,
    price: 9.99,
    pricePerSong: 1.0,
    priceId: process.env.STRIPE_FAMILY_PACK_PRICE_ID!,
    popular: true,
  },
  mega: {
    name: "Mega Pack",
    credits: 25,
    price: 19.99,
    pricePerSong: 0.8,
    priceId: process.env.STRIPE_MEGA_PACK_PRICE_ID!,
    popular: false,
  },
} as const;
