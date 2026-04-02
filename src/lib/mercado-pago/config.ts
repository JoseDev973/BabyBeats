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
