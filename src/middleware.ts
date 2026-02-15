import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || "automatio-dev-secret-change-in-production"
);

// Routes that don't require authentication
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/health"];
const STATIC_PREFIXES = ["/_next", "/favicon"];

function isPublicPath(pathname: string): boolean {
    if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
    if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
    // Static files
    if (pathname.match(/\.(ico|png|jpg|svg|css|js|woff2?)$/)) return true;
    return false;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip public paths
    if (isPublicPath(pathname)) {
        // If user is already logged in and visits /login, redirect to dashboard
        if (pathname === "/login") {
            const token = request.cookies.get("auth_token")?.value;
            if (token) {
                try {
                    await jwtVerify(token, SECRET_KEY);
                    return NextResponse.redirect(new URL("/dashboard", request.url));
                } catch {
                    // Token invalid, let them see login page
                }
            }
        }
        return NextResponse.next();
    }

    // Check auth token
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
        await jwtVerify(token, SECRET_KEY);
        return NextResponse.next();
    } catch {
        // Token expired or invalid
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete("auth_token");
        return response;
    }
}

export const config = {
    matcher: [
        // Match all paths except static files served by Next.js
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
