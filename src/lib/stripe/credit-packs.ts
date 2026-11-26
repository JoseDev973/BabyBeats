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

// Gift albums in USD (Stripe). Song counts must match GIFT_PACKS_COP.
export const GIFT_PACKS_USD = {
  first_album: { name: "My First Album", songs: 10, price: 14.99 },
  sweet_dreams: { name: "Sweet Dreams", songs: 5, price: 9.99 },
  learning: { name: "Learning with Music", songs: 5, price: 9.99 },
} as const;
