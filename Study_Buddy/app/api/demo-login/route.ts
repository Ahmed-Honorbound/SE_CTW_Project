import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const DEMO_EMAIL = "demo@studybuddy.com";
  const DEMO_PASSWORD = "demo123";

  if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set("auth", "true", {
    httpOnly: true,
    path: "/",
  });

  return response;
}
