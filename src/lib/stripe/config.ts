import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    features: [
      "Access to 15 free songs",
      "Basic categories",
      "Standard audio quality",
    ],
  },
  premium_monthly: {
    name: "Premium Monthly",
    price: 4.99,
    priceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID!,
    features: [
      "Unlimited songs",
      "All categories & age ranges",
      "High quality audio",
      "New songs every week",
      "Create playlists",
      "No ads",
    ],
  },
  premium_yearly: {
    name: "Premium Yearly",
    price: 39.99,
    priceId: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID!,
    features: [
      "Everything in Premium Monthly",
      "Save 33% vs monthly",
      "Early access to new songs",
    ],
  },
} as const;
