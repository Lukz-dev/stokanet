import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { verifyMercadoPagoWebhookSignature } from '../lib/mercadopago'

test('verifies a valid Mercado Pago webhook signature', () => {
  const secret = 'top-secret'
  const timestamp = '1712345678'
  const body = JSON.stringify({ id: 123, type: 'payment' })
  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')

  const result = verifyMercadoPagoWebhookSignature(`ts=${timestamp},v1=${expected}`, body, secret)

  assert.equal(result.ok, true)
  assert.equal(result.skipped, false)
})

test('rejects an invalid Mercado Pago webhook signature', () => {
  const result = verifyMercadoPagoWebhookSignature('ts=1712345678,v1=deadbeef', '{"id":123}', 'top-secret')

  assert.equal(result.ok, false)
  assert.equal(result.skipped, false)
})

test('skips verification when no webhook secret is configured', () => {
  const result = verifyMercadoPagoWebhookSignature(null, '{"id":123}', '')

  assert.equal(result.ok, true)
  assert.equal(result.skipped, true)
})
