const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PaymentModel } = require('./models');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

router.get('/config', (req, res) => {
  try {
    res.json({
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
    });
  } catch (error) {
    logger.error(`Error getting Stripe config: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get pricing plans
router.get('/plans', async (req, res) => {
  try {
    // Plans would be fetched from Stripe in production
    const plans = [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        priceYearly: 0,
        features: [
          'Real-time database access',
          'Authentication service',
          'Up to 1GB storage',
          'Up to 10,000 reads/day',
          'Up to 1,000 writes/day'
        ]
      },
      {
        id: 'basic',
        name: 'Basic',
        price: 9.99,
        priceYearly: 99.99,
        features: [
          'Everything in Free',
          'Up to 10GB storage',
          'Up to 100,000 reads/day',
          'Up to 10,000 writes/day',
          'Email support'
        ]
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 29.99,
        priceYearly: 299.99,
        features: [
          'Everything in Basic',
          'Up to 100GB storage',
          'Up to 1,000,000 reads/day',
          'Up to 100,000 writes/day',
          'Priority support',
          'Advanced security rules'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 99.99,
        priceYearly: 999.99,
        features: [
          'Everything in Pro',
          'Unlimited storage',
          'Unlimited reads/writes',
          'Dedicated support',
          'Custom security rules',
          'SLA guarantees',
          'AI-powered database operations'
        ]
      }
    ];
    
    res.json(plans);
  } catch (error) {
    logger.error(`Error getting pricing plans: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create checkout session
router.post('/create-checkout-session', authMiddleware, async (req, res) => {
  try {
    const { planId, billingCycle } = req.body;
    
    if (!planId || !billingCycle) {
      return res.status(400).json({ message: 'Plan ID and billing cycle are required' });
    }
    
    // Create a checkout session with Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Instantiate.dev ${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan (${billingCycle})`,
            },
            unit_amount: planId === 'basic' ? 999 : (planId === 'pro' ? 2999 : 9999),
            recurring: {
              interval: billingCycle === 'monthly' ? 'month' : 'year'
            }
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/index.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/pricing.html`,
      client_reference_id: req.user.id,
      metadata: {
        userId: req.user.id,
        planId,
        billingCycle
      }
    });
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    logger.error(`Error creating checkout session: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Webhook for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      return res.status(400).json({ message: 'Stripe signature is required' });
    }
    
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      logger.error(`Webhook signature verification failed: ${error.message}`);
      return res.status(400).json({ message: 'Webhook signature verification failed' });
    }
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Create a subscription in the database
        await PaymentModel.createSubscription(
          session.client_reference_id,
          session.metadata.planId,
          session.customer,
          'active',
          {
            billingCycle: session.metadata.billingCycle,
            sessionId: session.id
          }
        );
        
        logger.info(`Subscription created for user ${session.client_reference_id}`);
        break;
      }
      // Other event types would be handled here
    }
    
    res.json({ received: true });
  } catch (error) {
    logger.error(`Error handling webhook: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
