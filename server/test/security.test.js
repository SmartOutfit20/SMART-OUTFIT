import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldSkipAuthRateLimit } from '../src/config/rateLimits.js'
import { isMongoId } from '../src/config/ids.js'
import { hasPermission } from '../src/config/permissions.js'

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


test('Super Admin has the full permission set', () => {
  for (const permission of ['staff.manage','activity.read','orders.verify_payment','settings.manage']) assert.equal(hasPermission('super_admin', permission), true)
})

test('Admin can run store operations but cannot manage staff roles or Super Admin audit logs', () => {
  assert.equal(hasPermission('admin', 'orders.verify_payment'), true)
  assert.equal(hasPermission('admin', 'settings.manage'), true)
  assert.equal(hasPermission('admin', 'staff.manage'), false)
  assert.equal(hasPermission('admin', 'activity.read'), false)
})

test('Editor can manage catalogue and coupons but cannot adjust stock or orders', () => {
  assert.equal(hasPermission('editor', 'products.write'), true)
  assert.equal(hasPermission('editor', 'categories.write'), true)
  assert.equal(hasPermission('editor', 'coupons.write'), true)
  assert.equal(hasPermission('editor', 'inventory.write'), false)
  assert.equal(hasPermission('editor', 'orders.update'), false)
})

test('Support can handle tickets and orders but cannot verify payments', () => {
  assert.equal(hasPermission('support', 'support.manage'), true)
  assert.equal(hasPermission('support', 'orders.read'), true)
  assert.equal(hasPermission('support', 'orders.update'), true)
  assert.equal(hasPermission('support', 'orders.verify_payment'), false)
  assert.equal(hasPermission('support', 'settings.manage'), false)
})

test('Viewer is read-only and unknown roles receive no permissions', () => {
  assert.equal(hasPermission('viewer', 'products.read'), true)
  assert.equal(hasPermission('viewer', 'settings.read'), true)
  assert.equal(hasPermission('viewer', 'products.write'), false)
  assert.equal(hasPermission('viewer', 'orders.update'), false)
  assert.equal(hasPermission('unknown', 'products.read'), false)
  assert.equal(hasPermission('viewer', ''), false)
})
