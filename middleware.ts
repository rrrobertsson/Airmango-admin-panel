import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          res.cookies.set({ name, value, ...options })
        },
        remove: (name: string, options: any) => {
          res.cookies.set({ name, value: "", ...options })
        },
      },
    }
  )

  const { pathname, origin, search } = req.nextUrl

  // Fetch Supabase user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 🔒 Protected routes
  const isProtectedRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/api/users")

  // 🔐 Not logged in + trying to access protected route → redirect to /login
  if (isProtectedRoute && !user) {
    const loginUrl = new URL("/login", origin)
    loginUrl.searchParams.set("redirect", pathname + search)
    return NextResponse.redirect(loginUrl)
  }

  // 🏠 If visiting root "/", always redirect:
  // → to /login if not logged in
  // → to /dashboard if logged in
  if (pathname === "/") {
    const redirectUrl = user
      ? new URL("/dashboard", origin)
      : new URL("/login", origin)
    return NextResponse.redirect(redirectUrl)
  }

  // 🚀 If user is logged in and visits /login → redirect to /dashboard
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", origin))
  }

  return res
}

// ✅ Include "/" in matcher since we want to control homepage behavior
export const config = {
  matcher: ["/", "/login", "/dashboard/:path*", "/api/users"],
}
