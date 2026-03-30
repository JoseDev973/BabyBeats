import { NextResponse } from "next/server";

// Suno callback webhook - receives generation results
// This is a fallback; we also poll in the generate/audio route
export async function POST(request: Request) {
  const body = await request.json();
  console.log("[Suno Webhook] Received callback:", JSON.stringify(body));
  return NextResponse.json({ received: true });
}
