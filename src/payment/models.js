// Payment models for Stripe integration
const redis = require('redis');
const config = require('../../config/default');
const logger = require('../utils/logger');

// Redis client setup
const redisClient = redis.createClient({
  url: `redis://${config.redis.host}:${config.redis.port}`,
  password: config.redis.password || undefined,
  database: config.redis.db || 0
});

(async () => {
  try {
    await redisClient.connect();
    logger.info('Payment module connected to Redis');
  } catch (error) {
    logger.error(`Error connecting to Redis: ${error.message}`);
  }
})();


const PRICING_TIERS = {
  free: {
    name: 'Free',
    features: {
      storage: '1GB',
      reads: 10000,
      writes: 1000,
      support: 'Community'
    }
  },
  basic: {
    name: 'Basic',
    features: {
      storage: '10GB',
      reads: 100000,
      writes: 10000,
      support: 'Email'
    },
    prices: {
      monthly: 9.99,
      yearly: 99.99
    },
    stripeProductId: {
      test: process.env.STRIPE_BASIC_PRODUCT_ID_TEST,
      production: process.env.STRIPE_BASIC_PRODUCT_ID_PROD
    },
    stripePriceId: {
      monthly: {
        test: process.env.STRIPE_BASIC_PRICE_MONTHLY_TEST,
        production: process.env.STRIPE_BASIC_PRICE_MONTHLY_PROD
      },
      yearly: {
        test: process.env.STRIPE_BASIC_PRICE_YEARLY_TEST,
        production: process.env.STRIPE_BASIC_PRICE_YEARLY_PROD
      }
    }
  },
  pro: {
    name: 'Pro',
    features: {
      storage: '100GB',
      reads: 1000000,
      writes: 100000,
      support: 'Priority',
      advancedSecurity: true
    },
    prices: {
      monthly: 29.99,
      yearly: 299.99
    },
    stripeProductId: {
      test: process.env.STRIPE_PRO_PRODUCT_ID_TEST,
      production: process.env.STRIPE_PRO_PRODUCT_ID_PROD
    },
    stripePriceId: {
      monthly: {
        test: process.env.STRIPE_PRO_PRICE_MONTHLY_TEST,
        production: process.env.STRIPE_PRO_PRICE_MONTHLY_PROD
      },
      yearly: {
        test: process.env.STRIPE_PRO_PRICE_YEARLY_TEST,
        production: process.env.STRIPE_PRO_PRICE_YEARLY_PROD
      }
    }
  },
  enterprise: {
    name: 'Enterprise',
    features: {
      storage: 'Unlimited',
      reads: 'Unlimited',
      writes: 'Unlimited',
      support: 'Dedicated',
      advancedSecurity: true,
      customRules: true,
      sla: true,
      aiFeatures: true
    },
    prices: {
      monthly: 99.99,
      yearly: 999.99
    },
    stripeProductId: {
      test: process.env.STRIPE_ENTERPRISE_PRODUCT_ID_TEST,
      production: process.env.STRIPE_ENTERPRISE_PRODUCT_ID_PROD
    },
    stripePriceId: {
      monthly: {
        test: process.env.STRIPE_ENTERPRISE_PRICE_MONTHLY_TEST,
        production: process.env.STRIPE_ENTERPRISE_PRICE_MONTHLY_PROD
      },
      yearly: {
        test: process.env.STRIPE_ENTERPRISE_PRICE_YEARLY_TEST,
        production: process.env.STRIPE_ENTERPRISE_PRICE_YEARLY_PROD
      }
    }
  }
};

class PaymentModel {
  /**
   * Create a new subscription for a user
   * @param {string} userId - User ID
   * @param {string} plan - Plan tier (basic, pro, enterprise)
   * @param {string} billingCycle - Billing cycle (monthly, yearly)
   * @param {string} stripeCustomerId - Stripe customer ID
   * @param {string} stripeSubscriptionId - Stripe subscription ID
   * @returns {Promise<object>} - Subscription object
   */
  static async createSubscription(userId, plan, billingCycle, stripeCustomerId, stripeSubscriptionId) {
    try {
      if (!PRICING_TIERS[plan]) {
        throw new Error(`Invalid plan: ${plan}`);
      }
      
      if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
        throw new Error(`Invalid billing cycle: ${billingCycle}`);
      }
      
      const subscriptionId = `subscription:${userId}`;
      const now = Date.now();
      
      const expirationDate = billingCycle === 'monthly' 
        ? now + (30 * 24 * 60 * 60 * 1000) // 30 days
        : now + (365 * 24 * 60 * 60 * 1000); // 365 days
      
      const subscription = {
        userId,
        plan,
        billingCycle,
        stripeCustomerId,
        stripeSubscriptionId,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        expiresAt: expirationDate
      };
      
      await redisClient.set(subscriptionId, JSON.stringify(subscription));
      
      await redisClient.hSet(`user:${userId}`, {
        subscriptionPlan: plan,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expirationDate
      });
      
      logger.info(`Created subscription for user ${userId}: ${plan} (${billingCycle})`);
      
      return subscription;
    } catch (error) {
      logger.error(`Error creating subscription: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get a user's subscription
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} - Subscription object or null if not found
   */
  static async getUserSubscription(userId) {
    try {
      const subscriptionId = `subscription:${userId}`;
      const subscription = await redisClient.get(subscriptionId);
      
      if (!subscription) {
        return null;
      }
      
      return JSON.parse(subscription);
    } catch (error) {
      logger.error(`Error getting user subscription: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get a subscription by ID
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<object|null>} - Subscription object or null if not found
   */
  static async getSubscription(subscriptionId) {
    try {
      const subscription = await redisClient.get(subscriptionId);
      
      if (!subscription) {
        return null;
      }
      
      return JSON.parse(subscription);
    } catch (error) {
      logger.error(`Error getting subscription: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update a user's subscription
   * @param {string} userId - User ID
   * @param {object} updates - Fields to update
   * @returns {Promise<object>} - Updated subscription object
   */
  static async updateSubscription(userId, updates) {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        throw new Error(`Subscription not found for user ${userId}`);
      }
      
      const updatedSubscription = {
        ...subscription,
        ...updates,
        updatedAt: Date.now()
      };
      
      const subscriptionId = `subscription:${userId}`;
      await redisClient.set(subscriptionId, JSON.stringify(updatedSubscription));
      
      if (updates.plan || updates.status) {
        const userUpdates = {};
        
        if (updates.plan) {
          userUpdates.subscriptionPlan = updates.plan;
        }
        
        if (updates.status) {
          userUpdates.subscriptionStatus = updates.status;
        }
        
        if (updates.expiresAt) {
          userUpdates.subscriptionExpiresAt = updates.expiresAt;
        }
        
        await redisClient.hSet(`user:${userId}`, userUpdates);
      }
      
      logger.info(`Updated subscription for user ${userId}`);
      
      return updatedSubscription;
    } catch (error) {
      logger.error(`Error updating subscription: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Cancel a user's subscription
   * @param {string} userId - User ID
   * @returns {Promise<object>} - Updated subscription object
   */
  static async cancelSubscription(userId) {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        throw new Error(`Subscription not found for user ${userId}`);
      }
      
      const updatedSubscription = {
        ...subscription,
        status: 'canceled',
        updatedAt: Date.now()
      };
      
      const subscriptionId = `subscription:${userId}`;
      await redisClient.set(subscriptionId, JSON.stringify(updatedSubscription));
      
      await redisClient.hSet(`user:${userId}`, {
        subscriptionStatus: 'canceled'
      });
      
      logger.info(`Canceled subscription for user ${userId}`);
      
      return updatedSubscription;
    } catch (error) {
      logger.error(`Error canceling subscription: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Store a payment record
   * @param {string} userId - User ID
   * @param {string} stripePaymentId - Stripe payment ID
   * @param {number} amount - Payment amount
   * @param {string} currency - Payment currency
   * @param {string} status - Payment status
   * @returns {Promise<object>} - Payment object
   */
  static async recordPayment(userId, stripePaymentId, amount, currency, status) {
    try {
      const paymentId = `payment:${stripePaymentId}`;
      const now = Date.now();
      
      const payment = {
        userId,
        stripePaymentId,
        amount,
        currency,
        status,
        createdAt: now
      };
      
      await redisClient.set(paymentId, JSON.stringify(payment));
      
      logger.info(`Recorded payment for user ${userId}: ${amount} ${currency}`);
      
      return payment;
    } catch (error) {
      logger.error(`Error recording payment: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get a payment record
   * @param {string} stripePaymentId - Stripe payment ID
   * @returns {Promise<object|null>} - Payment object or null if not found
   */
  static async getPayment(stripePaymentId) {
    try {
      const paymentId = `payment:${stripePaymentId}`;
      const payment = await redisClient.get(paymentId);
      
      if (!payment) {
        return null;
      }
      
      return JSON.parse(payment);
    } catch (error) {
      logger.error(`Error getting payment: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get all payments for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of payment objects
   */
  static async getUserPayments(userId) {
    try {
      const keys = await redisClient.keys('payment:*');
      const payments = [];
      
      for (const key of keys) {
        const payment = await redisClient.get(key);
        
        if (payment) {
          const parsedPayment = JSON.parse(payment);
          
          if (parsedPayment.userId === userId) {
            payments.push(parsedPayment);
          }
        }
      }
      
      return payments.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      logger.error(`Error getting user payments: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Store a Stripe customer ID for a user
   * @param {string} userId - User ID
   * @param {string} stripeCustomerId - Stripe customer ID
   * @returns {Promise<void>}
   */
  static async setStripeCustomerId(userId, stripeCustomerId) {
    try {
      await redisClient.hSet(`user:${userId}`, {
        stripeCustomerId
      });
      
      logger.info(`Set Stripe customer ID for user ${userId}: ${stripeCustomerId}`);
    } catch (error) {
      logger.error(`Error setting Stripe customer ID: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get a user's Stripe customer ID
   * @param {string} userId - User ID
   * @returns {Promise<string|null>} - Stripe customer ID or null if not found
   */
  static async getStripeCustomerId(userId) {
    try {
      const user = await redisClient.hGetAll(`user:${userId}`);
      
      if (!user || !user.stripeCustomerId) {
        return null;
      }
      
      return user.stripeCustomerId;
    } catch (error) {
      logger.error(`Error getting Stripe customer ID: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get pricing information
   * @returns {object} - Pricing tiers information
   */
  static getPricingTiers() {
    return PRICING_TIERS;
  }
  
  /**
   * Get a specific pricing tier
   * @param {string} tier - Tier name (basic, pro, enterprise)
   * @returns {object|null} - Pricing tier information or null if not found
   */
  static getPricingTier(tier) {
    return PRICING_TIERS[tier] || null;
  }
}

module.exports = { PaymentModel, PRICING_TIERS };
