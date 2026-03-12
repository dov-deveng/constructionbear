import { Router } from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';

const router = Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// POST /stripe/create-checkout — start company subscription checkout
router.post('/create-checkout', requireAuth, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured yet' });

  const { plan = 'pro' } = req.body;
  const priceId = plan === 'business'
    ? (process.env.STRIPE_BUSINESS_PRICE_ID || process.env.STRIPE_PRICE_ID)
    : process.env.STRIPE_PRICE_ID;

  const db = getDb();
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.userId);
  const company = db.prepare('SELECT id, name, seats, stripe_customer_id, owner_id FROM companies WHERE id = ?').get(req.companyId);
  if (!company) return res.status(400).json({ error: 'No company found' });
  if (company.owner_id !== req.userId) return res.status(403).json({ error: 'Only the company owner can manage billing' });

  const seats = db.prepare('SELECT COUNT(*) as n FROM users WHERE company_id = ?').get(req.companyId).n;

  try {
    let customerId = company.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: company.name });
      customerId = customer.id;
      db.prepare('UPDATE companies SET stripe_customer_id = ? WHERE id = ?').run(customerId, company.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: Math.max(1, seats) }],
      metadata: { company_id: company.id, plan },
      success_url: `${process.env.CLIENT_URL}/?billing=success`,
      cancel_url: `${process.env.CLIENT_URL}/?billing=cancel`,
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
  const company = db.prepare('SELECT stripe_customer_id FROM companies WHERE id = ?').get(req.companyId);
  if (!company?.stripe_customer_id) return res.status(400).json({ error: 'No subscription found' });

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: `${process.env.CLIENT_URL}/?view=settings`,
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
  const company = db.prepare('SELECT plan, seats, stripe_subscription_id FROM companies WHERE id = ?').get(req.companyId);
  const plan = company?.plan || 'free';
  const seats = company?.seats || 1;
  const docCount = db.prepare('SELECT COUNT(*) as n FROM documents WHERE company_id = ?').get(req.companyId).n;
  const pricePerSeat = plan === 'business' ? 49.99 : plan === 'pro' ? 19.99 : 0;

  // Free: 1 user, 1 doc; paid: unlimited
  const canCreate = req.isAdmin || req.isTestAccount || plan === 'pro' || plan === 'business' || docCount < 1;

  res.json({
    status: plan,
    plan,
    seats,
    price_per_seat: pricePerSeat,
    total_monthly: pricePerSeat * seats,
    doc_count: docCount,
    can_create: canCreate,
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
    case 'checkout.session.completed': {
      const session = event.data.object;
      const companyId = session.metadata?.company_id;
      const plan = session.metadata?.plan || 'pro';
      if (companyId && session.subscription) {
        db.prepare(`UPDATE companies SET plan = ?, stripe_subscription_id = ? WHERE id = ?`)
          .run(plan, session.subscription, companyId);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const isActive = subscription.status === 'active';
      // Update company plan status
      db.prepare(`UPDATE companies SET stripe_subscription_id = ? WHERE stripe_customer_id = ?`)
        .run(subscription.id, subscription.customer);
      if (!isActive) {
        db.prepare(`UPDATE companies SET plan = 'free' WHERE stripe_customer_id = ? AND plan != 'free'`)
          .run(subscription.customer);
      }
      // Also keep legacy subscriptions table in sync
      db.prepare(`
        UPDATE subscriptions SET stripe_subscription_id = ?, status = ?, current_period_end = ?, updated_at = ?
        WHERE stripe_customer_id = ?
      `).run(subscription.id, isActive ? 'active' : 'inactive', subscription.current_period_end, Date.now() / 1000 | 0, subscription.customer);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      db.prepare(`UPDATE companies SET plan = 'free', stripe_subscription_id = NULL WHERE stripe_customer_id = ?`)
        .run(subscription.customer);
      db.prepare(`UPDATE subscriptions SET status = 'cancelled', updated_at = ? WHERE stripe_customer_id = ?`)
        .run(Date.now() / 1000 | 0, subscription.customer);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      db.prepare(`UPDATE companies SET plan = 'free' WHERE stripe_customer_id = ?`).run(invoice.customer);
      db.prepare(`UPDATE subscriptions SET status = 'past_due', updated_at = ? WHERE stripe_customer_id = ?`)
        .run(Date.now() / 1000 | 0, invoice.customer);
      break;
    }
  }

  res.json({ received: true });
});

export default router;
