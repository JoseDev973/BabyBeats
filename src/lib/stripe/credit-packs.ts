// Credit pack definitions — separated from Stripe SDK to allow
// importing in Server Components without loading the stripe package.

export const CREDIT_PACKS = {
  starter: {
    name: "Starter",
    credits: 3,
    price: 4.99,
    pricePerSong: 1.66,
    popular: false,
  },
  popular: {
    name: "Family Pack",
    credits: 10,
    price: 9.99,
    pricePerSong: 1.0,
    popular: true,
  },
  mega: {
    name: "Mega Pack",
    credits: 25,
    price: 19.99,
    pricePerSong: 0.8,
    popular: false,
  },
} as const;

export type CreditPackKey = keyof typeof CREDIT_PACKS;
