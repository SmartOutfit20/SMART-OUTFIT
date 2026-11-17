function cleanText(value, maxLength, multiline = false) {
  let text = String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  if (multiline) {
    text = text.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n')
  } else {
    text = text.replace(/\s+/g, ' ')
  }
  return text.trim().slice(0, maxLength)
}

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 })
}

export function normalizeSupportTicket(input) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {}

  // A filled honeypot is treated as accepted but is never persisted.
  if (cleanText(body.website, 120)) return { spam: true, ticket: null }

  const name = cleanText(body.name, 80)
  const email = cleanText(body.email, 254).toLowerCase()
  const phone = cleanText(body.phone, 20)
  const subject = cleanText(body.subject, 120)
  const message = cleanText(body.message, 3000, true)

  if (name.length < 2) throw badRequest('Enter your name (at least 2 characters).')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw badRequest('Enter a valid email address so our team can reply.')
  }
  if (phone && !/^01[3-9]\d{8}$/.test(phone)) {
    throw badRequest('Enter a valid 11-digit Bangladesh mobile number.')
  }
  if (subject.length < 3) throw badRequest('Enter a subject of at least 3 characters.')
  if (message.length < 10) throw badRequest('Your message must contain at least 10 characters.')

  return {
    spam: false,
    ticket: { name, email, phone, subject, message }
  }
}
