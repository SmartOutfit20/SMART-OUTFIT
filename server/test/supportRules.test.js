import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSupportTicket } from '../src/services/supportRules.js'

const valid = {
  name: '  Ayesha Rahman  ',
  email: 'AYESHA@example.com',
  phone: '01712345678',
  subject: 'Order delivery',
  message: 'Please let me know when my order will arrive.'
}

test('normalizes valid Bangladesh support contact details', () => {
  assert.deepEqual(normalizeSupportTicket(valid), {
    spam: false,
    ticket: {
      name: 'Ayesha Rahman',
      email: 'ayesha@example.com',
      phone: '01712345678',
      subject: 'Order delivery',
      message: 'Please let me know when my order will arrive.'
    }
  })
})

test('requires a usable name and reply email', () => {
  assert.throws(() => normalizeSupportTicket({ ...valid, name: 'A' }), /at least 2 characters/)
  assert.throws(() => normalizeSupportTicket({ ...valid, email: 'not-an-email' }), /valid email/)
})

test('validates an optional Bangladesh mobile number', () => {
  assert.equal(normalizeSupportTicket({ ...valid, phone: '' }).ticket.phone, '')
  assert.throws(() => normalizeSupportTicket({ ...valid, phone: '12345' }), /Bangladesh mobile/)
})

test('requires a useful subject and message', () => {
  assert.throws(() => normalizeSupportTicket({ ...valid, subject: 'Hi' }), /subject/)
  assert.throws(() => normalizeSupportTicket({ ...valid, message: 'Thanks' }), /at least 10 characters/)
})

test('silently accepts but does not persist a filled honeypot', () => {
  assert.deepEqual(normalizeSupportTicket({ ...valid, website: 'https://spam.example' }), {
    spam: true,
    ticket: null
  })
})

test('removes markup and bounds submitted text', () => {
  const result = normalizeSupportTicket({
    ...valid,
    name: '<b>Ayesha</b> Rahman',
    subject: '<script>alert(1)</script>Order',
    message: '<p>Please help with my order.</p>'
  })
  assert.equal(result.ticket.name, 'Ayesha Rahman')
  assert.equal(result.ticket.subject, 'alert(1) Order')
  assert.equal(result.ticket.message, 'Please help with my order.')
})
