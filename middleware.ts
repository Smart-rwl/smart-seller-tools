import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // ✅ Use getSession instead of getUser
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user

  const path = request.nextUrl.pathname

  // ✅ Clean public routes
  const PUBLIC_ROUTES = [
    '/',
    '/login',
    '/signup',
  ]

  const isPublicPage =
    PUBLIC_ROUTES.includes(path) ||
    path.startsWith('/auth') ||
    path.startsWith('/_next') ||
    path.startsWith('/api/public') ||
    path.startsWith('/images') ||
    path === '/favicon.ico'

  // ✅ PROTECTED ROUTES (future scalable)
  const isProtectedRoute =
    path.startsWith('/dashboard') ||
    path.startsWith('/tools') ||
    path.startsWith('/account')

  // 🔐 Redirect logic

  // 1. Not logged in → trying to access protected
  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Logged in → trying to access login/signup
  if (user && (path === '/login' || path === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
