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

  const { plan = 'regular' } = req.body;
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

    let lineItems;
    if (plan === 'pro') {
      // Pro: $129.99 base (5 users included) + $24.99 per additional seat
      const extraSeats = Math.max(0, seats - 5);
      lineItems = [
        { price: process.env.STRIPE_PRO_BASE_PRICE_ID, quantity: 1 },
        ...(extraSeats > 0 ? [{ price: process.env.STRIPE_PRO_SEAT_PRICE_ID, quantity: extraSeats }] : []),
      ];
    } else {
      // Regular: $29.99/seat
      lineItems = [{ price: process.env.STRIPE_REGULAR_PRICE_ID, quantity: Math.max(1, seats) }];
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
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

  // Monthly doc count for Regular plan limit
  const monthStart = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000);
  const monthlyDocCount = db.prepare('SELECT COUNT(*) as n FROM documents WHERE company_id = ? AND created_at >= ?').get(req.companyId, monthStart).n;
  const totalDocCount = db.prepare('SELECT COUNT(*) as n FROM documents WHERE company_id = ?').get(req.companyId).n;

  // Pricing
  let pricePerSeat = 0;
  let totalMonthly = 0;
  if (plan === 'regular') {
    pricePerSeat = 29.99;
    totalMonthly = pricePerSeat * seats;
  } else if (plan === 'pro') {
    const extraSeats = Math.max(0, seats - 5);
    totalMonthly = 129.99 + extraSeats * 24.99;
    pricePerSeat = seats > 0 ? totalMonthly / seats : 0;
  }

  // Doc limits: free=2 total, regular=100/month, pro=unlimited
  const canCreate = req.isAdmin || req.isTestAccount
    || plan === 'pro'
    || (plan === 'regular' && monthlyDocCount < 100)
    || (plan === 'free' && totalDocCount < 2);

  res.json({
    status: plan,
    plan,
    seats,
    price_per_seat: pricePerSeat,
    total_monthly: totalMonthly,
    doc_count: totalDocCount,
    monthly_doc_count: monthlyDocCount,
    monthly_doc_limit: plan === 'regular' ? 100 : plan === 'pro' ? null : 2,
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
      const plan = session.metadata?.plan || 'regular';
      if (companyId && session.subscription) {
        db.prepare('UPDATE companies SET plan = ?, stripe_subscription_id = ? WHERE id = ?')
          .run(plan, session.subscription, companyId);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const isActive = subscription.status === 'active';
      db.prepare('UPDATE companies SET stripe_subscription_id = ? WHERE stripe_customer_id = ?')
        .run(subscription.id, subscription.customer);
      if (!isActive) {
        db.prepare("UPDATE companies SET plan = 'free' WHERE stripe_customer_id = ? AND plan != 'free'")
          .run(subscription.customer);
      }
      db.prepare(`
        UPDATE subscriptions SET stripe_subscription_id = ?, status = ?, current_period_end = ?, updated_at = ?
        WHERE stripe_customer_id = ?
      `).run(subscription.id, isActive ? 'active' : 'inactive', subscription.current_period_end, Date.now() / 1000 | 0, subscription.customer);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      db.prepare("UPDATE companies SET plan = 'free', stripe_subscription_id = NULL WHERE stripe_customer_id = ?")
        .run(subscription.customer);
      db.prepare("UPDATE subscriptions SET status = 'cancelled', updated_at = ? WHERE stripe_customer_id = ?")
        .run(Date.now() / 1000 | 0, subscription.customer);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      db.prepare("UPDATE companies SET plan = 'free' WHERE stripe_customer_id = ?").run(invoice.customer);
      db.prepare("UPDATE subscriptions SET status = 'past_due', updated_at = ? WHERE stripe_customer_id = ?")
        .run(Date.now() / 1000 | 0, invoice.customer);
      break;
    }
  }

  res.json({ received: true });
});

export default router;
