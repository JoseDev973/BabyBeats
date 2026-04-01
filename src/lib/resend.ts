import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export const FROM_EMAIL = "hola@babybeats.art";
export const FROM_NAME = "BabyBeats";
export const FROM_ADDRESS = `${FROM_NAME} <${FROM_EMAIL}>`;
