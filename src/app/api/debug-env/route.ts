import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.slice(0, 20) + "..." : "EMPTY",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "SET (" + process.env.GOOGLE_CLIENT_SECRET.length + " chars)" : "EMPTY",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "EMPTY",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "EMPTY",
    DATABASE_URL: process.env.DATABASE_URL ? "SET" : "EMPTY",
  });
}
