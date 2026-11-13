import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldSkipAuthRateLimit } from '../src/config/rateLimits.js'
import { isMongoId } from '../src/config/ids.js'

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

test('accepts only 24-character hexadecimal MongoDB product IDs', () => {
  assert.equal(isMongoId('507f1f77bcf86cd799439011'), true)
  assert.equal(isMongoId('507F1F77BCF86CD799439011'), true)
  for (const value of ['', '123', 'not-an-id', '507f1f77bcf86cd79943901z', null]) {
    assert.equal(isMongoId(value), false)
  }
})
