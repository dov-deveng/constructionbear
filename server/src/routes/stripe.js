import { Router } from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';

const router = Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// POST /stripe/create-checkout — start subscription checkout
router.post('/create-checkout', requireAuth, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured yet' });

  const db = getDb();
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.userId);
  let sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(req.userId);

  try {
    let customerId = sub?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
      db.prepare('UPDATE subscriptions SET stripe_customer_id = ? WHERE user_id = ?')
        .run(customerId, req.userId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/subscription/cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /stripe/create-portal — manage existing subscription
router.post('/create-portal', requireAuth, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured yet' });

  const db = getDb();
  const sub = db.prepare('SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?').get(req.userId);
  if (!sub?.stripe_customer_id) return res.status(400).json({ error: 'No subscription found' });

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${process.env.CLIENT_URL}/settings`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe portal error:', err);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// GET /stripe/status
router.get('/status', requireAuth, (req, res) => {
  const db = getDb();
  const sub = db.prepare('SELECT status, current_period_end FROM subscriptions WHERE user_id = ?').get(req.userId);
  const docCount = db.prepare('SELECT COUNT(*) as n FROM documents WHERE user_id = ?').get(req.userId).n;

  res.json({
    status: sub?.status || 'free',
    current_period_end: sub?.current_period_end || null,
    doc_count: docCount,
    free_docs_used: docCount >= 1,
    can_create: req.isAdmin || docCount < 1 || sub?.status === 'active',
  });
});

// POST /stripe/webhook — Stripe events (raw body required)
router.post('/webhook', async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).send('Stripe not configured');

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const db = getDb();

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      db.prepare(`
        UPDATE subscriptions
        SET stripe_subscription_id = ?, status = ?, current_period_end = ?, updated_at = ?
        WHERE stripe_customer_id = ?
      `).run(
        subscription.id,
        subscription.status === 'active' ? 'active' : 'inactive',
        subscription.current_period_end,
        Date.now() / 1000 | 0,
        subscription.customer
      );
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      db.prepare(`
        UPDATE subscriptions SET status = 'cancelled', updated_at = ? WHERE stripe_customer_id = ?
      `).run(Date.now() / 1000 | 0, subscription.customer);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      db.prepare(`
        UPDATE subscriptions SET status = 'past_due', updated_at = ? WHERE stripe_customer_id = ?
      `).run(Date.now() / 1000 | 0, invoice.customer);
      break;
    }
  }

  res.json({ received: true });
});

export default router;
