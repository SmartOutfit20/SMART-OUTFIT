import { Router } from 'express'
import { SupportTicket } from '../models/index.js'
import { normalizeSupportTicket } from '../services/supportRules.js'

const router = Router()

router.post('/', async (req, res, next) => {
  try {
    const result = normalizeSupportTicket(req.body)
    if (result.spam) {
      return res.status(202).json({ message: 'Your message has been received.' })
    }

    const ticket = await SupportTicket.create(result.ticket)
    res.status(201).json({
      message: 'Your message has been received. Our support team will contact you.',
      ticketId: String(ticket._id)
    })
  } catch (error) {
    next(error)
  }
})

export default router
