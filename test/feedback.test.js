import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateFeedback, buildFeedbackDoc, buildEmailPayload,
  isEmailConfigured, typeLabel, FEEDBACK_TYPES, MAX_LENGTH,
} from '../src/utils/feedback.js'

test('validateFeedback — wymaga rodzaju i sensownego opisu', () => {
  assert.deepEqual(validateFeedback({ type: 'bug', message: 'Nie zapisuje nawyku' }), { ok: true, error: null })
  assert.equal(validateFeedback({ type: 'nieistniejacy', message: 'cokolwiek' }).ok, false)
  assert.equal(validateFeedback({ message: 'cokolwiek' }).ok, false)
  assert.equal(validateFeedback({ type: 'bug', message: 'ok' }).ok, false)
  assert.equal(validateFeedback({ type: 'bug', message: '          ' }).ok, false)
  assert.equal(validateFeedback().ok, false)
})

test('validateFeedback — górny limit długości', () => {
  const long = 'a'.repeat(MAX_LENGTH + 1)
  assert.equal(validateFeedback({ type: 'idea', message: long }).ok, false)
  assert.equal(validateFeedback({ type: 'idea', message: 'a'.repeat(MAX_LENGTH) }).ok, true)
})

test('buildFeedbackDoc — przycina tekst i dokłada dane zgłaszającego', () => {
  const doc = buildFeedbackDoc({
    type: 'bug',
    message: '  Kalendarz nie otwiera dnia  ',
    contact: ' kontakt@example.com ',
    user: { uid: 'u1', displayName: 'Laura', email: 'l@example.com' },
    context: { module: 'calendar' },
  })
  assert.equal(doc.message, 'Kalendarz nie otwiera dnia')
  assert.equal(doc.contact, 'kontakt@example.com')
  assert.equal(doc.userId, 'u1')
  assert.equal(doc.userName, 'Laura')
  assert.equal(doc.userEmail, 'l@example.com')
  assert.deepEqual(doc.context, { module: 'calendar' })
  assert.equal(doc.status, 'new')
})

test('buildFeedbackDoc — bez zalogowanego i bez kontaktu nie wywala się', () => {
  const doc = buildFeedbackDoc({ type: 'idea', message: 'Dodać widżet' })
  assert.equal(doc.contact, null)
  assert.equal(doc.userId, null)
  assert.deepEqual(doc.context, {})
})

test('isEmailConfigured — pusty klucz to brak wysyłki mailem', () => {
  assert.equal(isEmailConfigured(''), false)
  assert.equal(isEmailConfigured('   '), false)
  assert.equal(isEmailConfigured('za-krotki'), false)
  assert.equal(isEmailConfigured(undefined), false)
  assert.equal(isEmailConfigured('a1b2c3d4-e5f6-7890-abcd-ef1234567890'), true)
})

test('typeLabel — zna swoje rodzaje, nieznane traktuje jak „Inne"', () => {
  assert.equal(typeLabel('bug'), 'Błąd')
  assert.equal(typeLabel('idea'), 'Pomysł')
  assert.equal(typeLabel('cos-innego'), 'Inne')
  assert.equal(FEEDBACK_TYPES.length, 3)
})

test('buildEmailPayload — temat mówi, czego dotyczy zgłoszenie', () => {
  const doc = buildFeedbackDoc({
    type: 'bug',
    message: 'Pulpit wychodzi poza ekran na telefonie',
    user: { displayName: 'Laura', email: 'l@example.com' },
    context: { module: 'home', userAgent: 'Android', screen: '412x915' },
  })
  const payload = buildEmailPayload(doc, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
  assert.match(payload.subject, /^Apka — Błąd: Pulpit wychodzi poza ekran/)
  assert.equal(payload.access_key, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
  assert.equal(payload.wiadomosc, 'Pulpit wychodzi poza ekran na telefonie')
  assert.equal(payload.kontakt, 'l@example.com') // brak własnego kontaktu → mail z konta
  assert.equal(payload.moduł, 'home')
  assert.equal(payload.przeglądarka, 'Android')
})

test('buildEmailPayload — długa wiadomość nie rozsadza tematu', () => {
  const doc = buildFeedbackDoc({ type: 'idea', message: 'x'.repeat(300) })
  const payload = buildEmailPayload(doc, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
  assert.ok(payload.subject.length < 100, `temat ma ${payload.subject.length} znaków`)
  assert.equal(payload.wiadomosc.length, 300) // pełna treść zostaje w ciele
  assert.equal(payload.kontakt, '—')
})
