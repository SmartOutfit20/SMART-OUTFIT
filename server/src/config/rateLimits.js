const protectedAuthPosts = new Set(['/login', '/register', '/admin-login', '/bootstrap-admin'])

// Mounted under /api/auth, so Express exposes the remaining route in req.path.
export function shouldSkipAuthRateLimit(req) {
  return req?.method !== 'POST' || !protectedAuthPosts.has(String(req?.path || ''))
}
