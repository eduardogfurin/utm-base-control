import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    // Admin-only routes
    if (pathname.startsWith("/users") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Settings — admin only
    if (pathname.startsWith("/settings") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/vehicles/:path*",
    "/campaigns/:path*",
    "/links/:path*",
    "/templates/:path*",
    "/qrcodes/:path*",
    "/import/:path*",
    "/history/:path*",
    "/settings/:path*",
    "/users/:path*",
  ],
};
