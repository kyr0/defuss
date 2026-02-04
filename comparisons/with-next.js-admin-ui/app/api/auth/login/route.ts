import { NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_VALUE,
  isValidDemoLogin,
} from "@/lib/session";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let email = "";
  let password = "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const body = await request.text();
    const params = new URLSearchParams(body);
    email = params.get("email") ?? "";
    password = params.get("password") ?? "";
  } else {
    const formData = await request.formData();
    email = String(formData.get("email") ?? "");
    password = String(formData.get("password") ?? "");
  }

  if (!isValidDemoLogin(email, password)) {
    return NextResponse.redirect(
      new URL("/?error=invalid_credentials", request.url),
      { status: 303 }
    );
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url), {
    status: 303,
  });
  response.cookies.set(SESSION_COOKIE_NAME, SESSION_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
