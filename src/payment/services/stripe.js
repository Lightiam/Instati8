const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../../utils/logger');
const { PaymentModel } = require('../models');

class StripeService {
  /**
   * Initialize Stripe with the appropriate API key
   * @returns {object} - Stripe instance
   */
  static getStripeInstance() {
    const apiKey = process.env.NODE_ENV === 'production'
      ? process.env.STRIPE_SECRET_KEY
      : process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
    
    return require('stripe')(apiKey);
  }
  
  /**
   * Get Stripe publishable key for client-side integration
   * @returns {string} - Stripe publishable key
   */
  static getPublishableKey() {
    return process.env.NODE_ENV === 'production'
      ? process.env.STRIPE_PUBLISHABLE_KEY
      : process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder';
  }
  
  /**
   * Create a Stripe customer
   * @param {string} email - Customer email
   * @param {string} userId - User ID
   * @returns {Promise<object>} - Stripe customer object
   */
  static async createCustomer(email, userId) {
    try {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userId
        }
      });
      
      await PaymentModel.setStripeCustomerId(userId, customer.id);
      
      logger.info(`Created Stripe customer for user ${userId}: ${customer.id}`);
      
      return customer;
    } catch (error) {
      logger.error(`Error creating Stripe customer: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Create a Stripe checkout session
   * @param {string} customerId - Stripe customer ID
   * @param {string} priceId - Stripe price ID
   * @param {string} successUrl - Success URL
   * @param {string} cancelUrl - Cancel URL
   * @param {object} metadata - Additional metadata
   * @returns {Promise<object>} - Stripe checkout session
   */
  static async createCheckoutSession(customerId, priceId, successUrl, cancelUrl, metadata = {}) {
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata
      });
      
      logger.info(`Created Stripe checkout session: ${session.id}`);
      
      return session;
    } catch (error) {
      logger.error(`Error creating Stripe checkout session: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Cancel a Stripe subscription
   * @param {string} subscriptionId - Stripe subscription ID
   * @returns {Promise<object>} - Stripe subscription object
   */
  static async cancelSubscription(subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
      
      logger.info(`Canceled Stripe subscription: ${subscriptionId}`);
      
      return subscription;
    } catch (error) {
      logger.error(`Error canceling Stripe subscription: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get a Stripe subscription
   * @param {string} subscriptionId - Stripe subscription ID
   * @returns {Promise<object>} - Stripe subscription object
   */
  static async getSubscription(subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      return subscription;
    } catch (error) {
      logger.error(`Error getting Stripe subscription: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get a customer's invoices
   * @param {string} customerId - Stripe customer ID
   * @returns {Promise<Array>} - Array of Stripe invoice objects
   */
  static async getCustomerInvoices(customerId) {
    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: 10
      });
      
      return invoices.data;
    } catch (error) {
      logger.error(`Error getting customer invoices: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Verify a Stripe webhook signature
   * @param {string} payload - Request body
   * @param {string} signature - Stripe signature
   * @returns {object} - Stripe event
   */
  static verifyWebhookSignature(payload, signature) {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        throw new Error('Stripe webhook secret not configured');
      }
      
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      
      return event;
    } catch (error) {
      logger.error(`Webhook signature verification failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get price ID based on plan, billing cycle, and environment
   * @param {string} plan - Plan tier (basic, pro, enterprise)
   * @param {string} billingCycle - Billing cycle (monthly, yearly)
   * @returns {string} - Stripe price ID
   */
  static getPriceId(plan, billingCycle) {
    const environment = process.env.NODE_ENV === 'production' ? 'production' : 'test';
    const pricingTiers = PaymentModel.getPricingTiers();
    
    if (!pricingTiers[plan]) {
      throw new Error(`Invalid plan: ${plan}`);
    }
    
    if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
      throw new Error(`Invalid billing cycle: ${billingCycle}`);
    }
    
    return pricingTiers[plan].stripePriceId[billingCycle][environment];
  }
}

module.exports = StripeService;
