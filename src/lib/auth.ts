import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || "automatio-dev-secret-change-in-production"
);

export async function signToken(payload: any) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(SECRET_KEY);
}

export async function verifyToken(token: string) {
    try {
        const splitToken = token.startsWith("Bearer ") ? token.split(" ")[1] : token;
        const { payload } = await jwtVerify(splitToken, SECRET_KEY);
        return payload;
    } catch (error) {
        return null;
    }
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return null;
    return verifyToken(token);
}

export async function login(payload: any) {
    const token = await signToken(payload);
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
    });
    return token;
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");
}
