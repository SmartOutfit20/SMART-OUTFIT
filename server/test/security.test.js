import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldSkipAuthRateLimit } from '../src/config/rateLimits.js'

test('rate limits every authentication entry point, including staff login', () => {
  for (const path of ['/login', '/register', '/admin-login', '/bootstrap-admin']) {
    assert.equal(shouldSkipAuthRateLimit({ method: 'POST', path }), false, path + ' must be rate limited')
  }
})

test('does not apply the authentication limiter to unrelated routes or methods', () => {
  for (const request of [
    { method: 'GET', path: '/login' },
    { method: 'POST', path: '/me' },
    { method: 'POST', path: '/unknown' },
    { method: 'PATCH', path: '/admin-login' }
  ]) {
    assert.equal(shouldSkipAuthRateLimit(request), true, JSON.stringify(request))
  }
})
