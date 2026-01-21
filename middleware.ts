import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here if needed
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - api/assistant (assistant API routes - handle auth internally)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - login page
     */
    '/((?!api/auth|api/assistant|_next/static|_next/image|login).*)',
  ],
}