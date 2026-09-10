import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_USERS,
  ADMIN_COOKIE_NAME,
  createSessionToken,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Informe o usuário e a senha." },
        { status: 400 }
      );
    }

    const normalizedUser = String(username).toLowerCase().trim();
    const validPassword = ADMIN_USERS[normalizedUser];

    if (!validPassword || validPassword !== String(password).trim()) {
      return NextResponse.json(
        { error: "Usuário ou senha incorretos." },
        { status: 401 }
      );
    }

    const displayName =
      normalizedUser.charAt(0).toUpperCase() + normalizedUser.slice(1);
    const sessionToken = createSessionToken(normalizedUser);

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      username: displayName,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
