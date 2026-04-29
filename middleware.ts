import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieToSet = { name: string; value: string; options: CookieOptions }

/**
 * Supabase auth middleware
 * ---------------------------------------------------------------------------
 * Without this, Supabase session cookies can drift between server and browser
 * because the JWT refresh-token rotation is never propagated server-side.
 * Symptoms: getSession() / getUser() hang forever in client components after
 * the access token expires (default 1h), and no fix short of clearing
 * localStorage works.
 *
 * The pattern below is the official recommendation from @supabase/ssr:
 * - Read every request's auth cookies
 * - Call getUser() server-side, which transparently rotates the refresh token
 *   and writes fresh cookies back to the response
 * - Forward those cookies to the browser
 *
 * Result: tokens stay valid as the user navigates, and getSession() in client
 * components always finds a fresh, non-expired JWT.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh the session if needed. We don't care about the result here —
  // the side effect (writing fresh cookies) is what matters.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (Image optimization)
     * - favicon.ico
     * - public assets (any file with an extension)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
