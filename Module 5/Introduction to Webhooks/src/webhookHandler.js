'use strict';



// ─── YOUR FILE — implement this ───────────────────────────────────────────────
// Export handleWebhook(req, res), used by POST /webhooks in app.js.
// Also export _processedIds (your Set or Map) for test inspection/reset.
//
// Steps (in order):
//  1. Verify HMAC-SHA256 signature
//     - Signature header: req.headers['x-webhook-signature'] → 'sha256=<hex>'
//     - Compute: crypto.createHmac('sha256', WEBHOOK_SECRET).update(req.body).digest('hex')
//     - Compare: crypto.timingSafeEqual(Buffer.from(expected,'hex'), Buffer.from(received,'hex'))
//     - Mismatch or missing → res.status(401).json({ error: 'Invalid signature' })
//
//  2. Parse body: const event = JSON.parse(req.body)
//
//  3. Idempotency: if _processedIds.has(event.id) → res.status(200).json({ status: 'already_processed' })
//
//  4. Mark: _processedIds.add(event.id)
//
//  5. Acknowledge: res.status(200).json({ status: 'received' })
//     Then call handleEvent(event) inside setImmediate(() => { ... })
const crypto = require('crypto');
const { handleEvent } = require('./eventHandlers');

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'testsecret';
const _processedIds = new Set();

function verifySignature(rawBody, sigHeader) {
  if (!Buffer.isBuffer(rawBody) || typeof sigHeader !== 'string') return false;
  if (!sigHeader.startsWith('sha256=')) return false;
  const received = sigHeader.slice('sha256='.length);
  if (!/^[0-9a-f]{64}$/i.test(received)) return false;

  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  const receivedBuf = Buffer.from(received, 'hex');
  if (expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

function handleWebhook(req, res) {
  if (!verifySignature(req.body, req.headers['x-webhook-signature'])) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch (error) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  if (_processedIds.has(event.id)) {
    return res.status(200).json({ status: 'already_processed' });
  }

  _processedIds.add(event.id);
  res.status(200).json({ status: 'received' });

  setImmediate(() => {
    Promise.resolve()
      .then(() => handleEvent(event))
      .catch((error) => console.error('handleEvent failed:', error));
  });
}

module.exports = { handleWebhook, _processedIds };
