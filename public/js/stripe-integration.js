document.addEventListener('DOMContentLoaded', function() {
  const billingToggle = document.getElementById('billing-toggle');
  const monthlyLabel = document.getElementById('monthly-label');
  const yearlyLabel = document.getElementById('yearly-label');
  
  const prices = {
    basic: {
      monthly: 9.99,
      yearly: 99.99
    },
    pro: {
      monthly: 29.99,
      yearly: 299.99
    },
    enterprise: {
      monthly: 99.99,
      yearly: 999.99
    }
  };
  
  function updatePrices(isYearly) {
    const basicPrice = document.getElementById('basic-price');
    const proPrice = document.getElementById('pro-price');
    const enterprisePrice = document.getElementById('enterprise-price');
    const basicPeriod = document.getElementById('basic-period');
    const proPeriod = document.getElementById('pro-period');
    const enterprisePeriod = document.getElementById('enterprise-period');
    
    basicPrice.textContent = isYearly ? `$${prices.basic.yearly}` : `$${prices.basic.monthly}`;
    proPrice.textContent = isYearly ? `$${prices.pro.yearly}` : `$${prices.pro.monthly}`;
    enterprisePrice.textContent = isYearly ? `$${prices.enterprise.yearly}` : `$${prices.enterprise.monthly}`;
    
    const period = isYearly ? 'per year' : 'per month';
    basicPeriod.textContent = period;
    proPeriod.textContent = period;
    enterprisePeriod.textContent = period;
    
    const buttons = document.querySelectorAll('[data-plan]');
    buttons.forEach(button => {
      button.setAttribute('data-billing-cycle', isYearly ? 'yearly' : 'monthly');
    });
  }
  
  if (billingToggle) {
    billingToggle.addEventListener('change', function() {
      const isYearly = this.checked;
      
      monthlyLabel.classList.toggle('active', !isYearly);
      yearlyLabel.classList.toggle('active', isYearly);
      
      updatePrices(isYearly);
    });
  }
  
  let stripe;
  
  async function initializeStripe() {
    try {
      const response = await fetch('/api/payment/config');
      const { publishableKey } = await response.json();
      
      stripe = Stripe(publishableKey);
    } catch (error) {
      console.error('Error initializing Stripe:', error);
    }
  }
  
  const subscribeButtons = document.querySelectorAll('[data-plan]');
  
  subscribeButtons.forEach(button => {
    button.addEventListener('click', async function() {
      const token = localStorage.getItem('token');
      
      if (!token) {
        sessionStorage.setItem('fromLanding', 'true');
        sessionStorage.setItem('redirectAfterLogin', '/pricing.html');
        window.location.href = '/index.html';
        return;
      }
      
      const plan = this.getAttribute('data-plan');
      const billingCycle = this.getAttribute('data-billing-cycle');
      
      try {
        const response = await fetch('/api/payment/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            plan,
            billingCycle
          })
        });
        
        const { sessionId } = await response.json();
        
        if (stripe) {
          const { error } = await stripe.redirectToCheckout({
            sessionId
          });
          
          if (error) {
            console.error('Error redirecting to checkout:', error);
          }
        } else {
          console.error('Stripe not initialized');
        }
      } catch (error) {
        console.error('Error creating checkout session:', error);
      }
    });
  });
  
  initializeStripe();
});
