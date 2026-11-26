import { MercadoPagoConfig } from "mercadopago";

let _mp: MercadoPagoConfig | null = null;

export function getMercadoPago() {
  if (!_mp && process.env.MP_ACCESS_TOKEN) {
    _mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  }
  return _mp!;
}

export const CREDIT_PACKS_COP = {
  starter: {
    name: "Starter",
    credits: 3,
    price: 15000,
    pricePerSong: 5000,
    popular: false,
  },
  popular: {
    name: "Family Pack",
    credits: 10,
    price: 29000,
    pricePerSong: 2900,
    popular: true,
  },
  mega: {
    name: "Mega Pack",
    credits: 25,
    price: 59000,
    pricePerSong: 2360,
    popular: false,
  },
} as const;

export type CreditPackKey = keyof typeof CREDIT_PACKS_COP;

// Gift albums. `songs` is the source of truth for how many songs a paid gift
// may generate and how many credits a redeemed gift grants.
export const GIFT_PACKS_COP = {
  first_album: { name: "Mi Primer Álbum", songs: 10, price: 59900 },
  sweet_dreams: { name: "Dulces Sueños", songs: 5, price: 39900 },
  learning: { name: "Aprendiendo con Música", songs: 5, price: 39900 },
} as const;

export type GiftPackKey = keyof typeof GIFT_PACKS_COP;

export function isGiftPack(value: unknown): value is GiftPackKey {
  return typeof value === "string" && value in GIFT_PACKS_COP;
}
