import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getAllowedOrderStatusTransitions,
  isOrderStatusTransitionAllowed,
  getOrderStatusTransitionMessage
} from '../src/services/orderStatusRules.js'

test('pending COD orders can be confirmed or cancelled', () => {
  assert.deepEqual(getAllowedOrderStatusTransitions('pending', 'unpaid'), ['confirmed', 'cancelled'])
  assert.equal(isOrderStatusTransitionAllowed('pending', 'confirmed', 'unpaid'), true)
  assert.equal(isOrderStatusTransitionAllowed('pending', 'cancelled', 'unpaid'), true)
})

test('confirmed orders can move to processing or be cancelled', () => {
  assert.deepEqual(getAllowedOrderStatusTransitions('confirmed', 'unpaid'), ['processing', 'cancelled'])
  assert.equal(isOrderStatusTransitionAllowed('confirmed', 'shipped', 'unpaid'), false)
})

test('processing orders can move to shipped or be cancelled', () => {
  assert.deepEqual(getAllowedOrderStatusTransitions('processing'), ['shipped', 'cancelled'])
  assert.equal(isOrderStatusTransitionAllowed('processing', 'delivered'), false)
})

test('shipped orders can only move to delivered', () => {
  assert.deepEqual(getAllowedOrderStatusTransitions('shipped'), ['delivered'])
  assert.equal(isOrderStatusTransitionAllowed('shipped', 'cancelled'), false)
})

test('delivered, cancelled and returned orders are terminal in the generic status API', () => {
  for (const status of ['delivered', 'partially_returned', 'cancelled', 'returned']) {
    assert.deepEqual(getAllowedOrderStatusTransitions(status), [])
    assert.equal(isOrderStatusTransitionAllowed(status, 'processing'), false)
  }
})

test('same-state and unknown transitions are rejected', () => {
  assert.equal(isOrderStatusTransitionAllowed('pending', 'pending'), false)
  assert.equal(isOrderStatusTransitionAllowed('unknown', 'confirmed'), false)
  assert.equal(isOrderStatusTransitionAllowed('pending', 'unknown'), false)
})

test('orders awaiting advance-payment verification can only be cancelled', () => {
  assert.deepEqual(getAllowedOrderStatusTransitions('pending', 'pending'), ['cancelled'])
  assert.equal(isOrderStatusTransitionAllowed('pending', 'confirmed', 'pending'), false)
  assert.equal(isOrderStatusTransitionAllowed('pending', 'cancelled', 'pending'), true)
})

test('delivery workspace cannot skip fulfilment steps', () => {
  assert.equal(isOrderStatusTransitionAllowed('confirmed', 'delivered', 'unpaid'), false)
  assert.equal(isOrderStatusTransitionAllowed('processing', 'delivered', 'unpaid'), false)
  assert.equal(isOrderStatusTransitionAllowed('shipped', 'delivered', 'unpaid'), true)
})

test('provides an actionable conflict message for invalid transitions', () => {
  assert.match(getOrderStatusTransitionMessage('shipped', 'cancelled'), /cannot move from "shipped" to "cancelled"/)
})
