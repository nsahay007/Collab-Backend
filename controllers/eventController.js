const mongoose = require('mongoose')
const Hackathon = require('../models/Hackathon')

const LEGACY_PHASES = { HACKATHON_OPEN: 'EVENT_STARTED', HACKATHON_CLOSED: 'EVENT_ENDED' }
const eventPhase = (value) => LEGACY_PHASES[value] || value || 'COMING_SOON'
const publicUrl = (value) => (/^https?:\/\/\S+$/i.test(String(value || '').trim()) ? String(value).trim() : '')
const lookup = (idOrSlug) => mongoose.Types.ObjectId.isValid(String(idOrSlug || '')) ? { _id: idOrSlug } : { slug: String(idOrSlug || '').trim() }
const visibleQuery = (req) => req.user?.role === 'admin'
  ? { status: { $ne: 'archived' } }
  : { status: { $ne: 'archived' }, visibility: 'public' }
const isRegistrationOpen = (event) => {
  if (eventPhase(event.phase) !== 'REGISTRATIONS_OPEN') return false
  const now = Date.now()
  return (!event.registrationOpens || new Date(event.registrationOpens).getTime() <= now) && (!event.registrationCloses || new Date(event.registrationCloses).getTime() >= now)
}

const eventView = (event) => ({
  id: String(event._id),
  title: event.title,
  slug: event.slug || String(event._id),
  description: event.description || '',
  organizer: event.organizer || '',
  location: event.location || '',
  mode: event.mode || 'online',
  banner: publicUrl(event.bannerUrl),
  registrationUrl: publicUrl(event.registrationUrl),
  registrationButtonText: event.registrationButtonText || 'Register Now',
  registrationOpen: isRegistrationOpen(event),
  registrationOpens: event.registrationOpens || null,
  registrationDeadline: event.registrationCloses || null,
  eventStart: event.startDate || null,
  eventEnd: event.endDate || null,
  eligibility: event.eligibility || '',
  rules: event.rules || '',
  brochure: event.brochure || '',
  phase: eventPhase(event.phase),
  visibility: event.visibility,
  awards: (event.awards || []).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)).map((award) => ({
    title: award.title,
    teamName: award.teamName || '',
    projectName: award.projectName || ''
  }))
})

exports.listEvents = async (req, res) => {
  try {
    const events = await Hackathon.find(visibleQuery(req)).sort({ startDate: 1, createdAt: -1 }).lean()
    res.json({ events: events.map(eventView) })
  } catch (error) {
    console.error('List events error:', error)
    res.status(500).json({ message: 'Failed to load events' })
  }
}

exports.getEventDetails = async (req, res) => {
  try {
    const event = await Hackathon.findOne({ ...lookup(req.params.id), ...visibleQuery(req) }).lean()
    if (!event) return res.status(404).json({ message: 'Event not found' })
    res.json({ event: eventView(event) })
  } catch (error) {
    console.error('Event detail error:', error)
    res.status(500).json({ message: 'Failed to load event' })
  }
}
