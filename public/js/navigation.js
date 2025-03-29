/**
 * Centralized navigation system for Instanti8.dev
 */
document.addEventListener('DOMContentLoaded', () => {
  const routes = {
    landing: '/landing.html',
    login: '/index.html',
    signup: '/signup.html',
    pricing: '/pricing.html',
    dashboard: '/ai-dashboard.html'
  };
  
  document.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const route = link.getAttribute('data-nav');
      if (routes[route]) {
        navigateTo(route);
      }
    });
  });
  
  window.navigateTo = (route) => {
    if (routes[route]) {
      window.location.href = routes[route];
    } else {
      console.error(`Route "${route}" not found`);
    }
  };
});
