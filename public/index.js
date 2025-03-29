window.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    const fromLanding = sessionStorage.getItem('fromLanding');
    
    if (!fromLanding) {
      window.location.href = '/landing.html';
    }
  }
});
