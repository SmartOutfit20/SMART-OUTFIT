const STORAGE_KEY = 'so-checkout-attempt-v1'
const KEY_PATTERN = /^[0-9a-f-]{36}$/i

function canonicalPayload(payload = {}) {
  const items = (Array.isArray(payload.items) ? payload.items : []).map(item => ({
    productId: String(item.productId || '').trim().toLowerCase(),
    quantity: Number(item.quantity),
    size: String(item.size || '').trim().toLowerCase(),
    color: String(item.color || '').trim().toLowerCase()
  })).sort((a, b) => {
    const left = [a.productId, a.size, a.color].join('|')
    const right = [b.productId, b.size, b.color].join('|')
    return left < right ? -1 : left > right ? 1 : 0
  })
  const address = payload.deliveryAddress || {}
  return {
    items,
    deliveryAddress: {
      name: String(address.name || '').trim(),
      phone: String(address.phone || '').trim(),
      division: String(address.division || '').trim(),
      district: String(address.district || '').trim(),
      upazila: String(address.upazila || '').trim(),
      address: String(address.address || '').trim()
    },
    paymentMethod: String(payload.paymentMethod || 'cod').trim().toLowerCase(),
    advancePaymentMethod: String(payload.advancePaymentMethod || '').trim().toLowerCase(),
    advancePaymentSender: String(payload.advancePaymentSender || '').trim(),
    advancePaymentTransactionId: String(payload.advancePaymentTransactionId || '').trim(),
    couponCode: String(payload.couponCode || '').trim().toUpperCase()
  }
}

function createUuid(cryptoApi) {
  if (typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID()
  const bytes = new Uint8Array(16)
  cryptoApi.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('')
  return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20)
}

async function fingerprint(payload, cryptoApi) {
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalPayload(payload)))
  const digest = await cryptoApi.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('')
}

export async function getCheckoutAttempt(payload, storage = globalThis.localStorage, cryptoApi = globalThis.crypto) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new Error('Secure checkout retry storage is unavailable.')
  }
  if (!cryptoApi?.subtle?.digest || typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('Secure checkout retry protection is unavailable in this browser.')
  }
  const requestFingerprint = await fingerprint(payload, cryptoApi)
  let saved
  try { saved = JSON.parse(storage.getItem(STORAGE_KEY) || 'null') } catch { saved = null }
  if (saved?.version === 1 && saved.fingerprint === requestFingerprint && KEY_PATTERN.test(saved.key || '')) {
    return { key: saved.key, fingerprint: requestFingerprint, reused: true }
  }
  const attempt = { version: 1, fingerprint: requestFingerprint, key: createUuid(cryptoApi) }
  storage.setItem(STORAGE_KEY, JSON.stringify(attempt))
  return { key: attempt.key, fingerprint: requestFingerprint, reused: false }
}

export function clearCheckoutAttempt(key, storage = globalThis.localStorage) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.removeItem !== 'function') return false
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) || 'null')
    if (saved?.key !== key) return false
    storage.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
