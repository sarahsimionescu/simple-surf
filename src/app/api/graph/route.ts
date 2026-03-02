import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Sorry, we ran out of credits. Please try again later." },
    { status: 503 },
  );
}
