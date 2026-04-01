import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = "hola@babybeats.art";
export const FROM_NAME = "BabyBeats";
export const FROM_ADDRESS = `${FROM_NAME} <${FROM_EMAIL}>`;
