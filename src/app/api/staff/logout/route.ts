import { NextResponse } from "next/server";
import { STAFF_COOKIE } from "@/features/auth/session";

export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(STAFF_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
