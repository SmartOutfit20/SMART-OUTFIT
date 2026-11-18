import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeReturnRequest, assessReturnEligibility } from '../src/services/returnRules.js'
const now = new Date('2026-11-18T03:00:00.000Z')
const deliveredOrder = (overrides = {}) => ({status:'delivered',paymentStatus:'paid',statusHistory:[{status:'delivered',createdAt:new Date(now.getTime()-2*24*60*60*1000)}],returnRequests:[],...overrides})
test('normalizes customer return reasons and removes markup/control characters',()=>{assert.deepEqual(normalizeReturnRequest({reason:'  <b>Wrong size</b> — it does not fit.  '}),{reason:'Wrong size — it does not fit.'})})
test('rejects missing, too-short and overlong return reasons',()=>{assert.throws(()=>normalizeReturnRequest({reason:'Too short'}),/at least 10 characters/);assert.throws(()=>normalizeReturnRequest({reason:'x'.repeat(1001)}),/1,000 characters or fewer/)})
test('allows a paid delivered order within the seven-day return window',()=>{const result=assessReturnEligibility(deliveredOrder(),now);assert.equal(result.returnWindowDays,7);assert.equal(result.expiresAt.getTime(),now.getTime()+5*24*60*60*1000)})
test('rejects orders that are not delivered or do not have verified payment',()=>{assert.throws(()=>assessReturnEligibility(deliveredOrder({status:'shipped'}),now),/Only delivered orders/);assert.throws(()=>assessReturnEligibility(deliveredOrder({paymentStatus:'unpaid'}),now),/verified payment/)})
test('rejects a return when the delivered timestamp is missing',()=>{assert.throws(()=>assessReturnEligibility(deliveredOrder({statusHistory:[]}),now),/delivery date is missing/)})
test('rejects a request after the return window expires',()=>{const order=deliveredOrder({statusHistory:[{status:'delivered',createdAt:new Date(now.getTime()-8*24*60*60*1000)}]});assert.throws(()=>assessReturnEligibility(order,now),/window has expired/)})
test('prevents duplicate active requests but permits a new request after rejection',()=>{assert.throws(()=>assessReturnEligibility(deliveredOrder({returnRequests:[{status:'approved'}]}),now),/already active/);assert.doesNotThrow(()=>assessReturnEligibility(deliveredOrder({returnRequests:[{status:'rejected'}]}),now))})
