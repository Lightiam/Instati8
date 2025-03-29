/**
 * Debug utilities for Instanti8.dev
 */
(function() {
  const DEBUG_MODE = window.location.search.includes('debug=true');
  
  window.debugLog = function(message, data) {
    if (!DEBUG_MODE) return;
    
    console.log(`%c[DEBUG] ${message}`, 'color: #4facfe', data || '');
    
    const debugPanel = document.getElementById('debug-panel');
    if (debugPanel) {
      const entry = document.createElement('div');
      entry.className = 'debug-entry';
      entry.innerHTML = `
        <div class="debug-time">${new Date().toISOString().split('T')[1].slice(0, 8)}</div>
        <div class="debug-message">${message}</div>
        ${data ? `<div class="debug-data">${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}</div>` : ''}
      `;
      debugPanel.appendChild(entry);
      debugPanel.scrollTop = debugPanel.scrollHeight;
    }
  };
  
  if (DEBUG_MODE) {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = `
        #debug-panel {
          position: fixed;
          bottom: 0;
          right: 0;
          width: 400px;
          height: 300px;
          background-color: rgba(17, 24, 39, 0.95);
          border: 1px solid #374151;
          border-radius: 8px 0 0 0;
          color: #f8fafc;
          font-family: monospace;
          font-size: 12px;
          z-index: 9999;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
        }
        
        #debug-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 1px solid #374151;
        }
        
        #debug-panel-title {
          font-weight: bold;
          color: #4facfe;
        }
        
        #debug-panel-actions {
          display: flex;
          gap: 5px;
        }
        
        #debug-panel-actions button {
          background-color: #1f2937;
          border: 1px solid #374151;
          border-radius: 4px;
          color: #f8fafc;
          cursor: pointer;
          font-size: 10px;
          padding: 2px 5px;
        }
        
        #debug-panel-actions button:hover {
          background-color: #374151;
        }
        
        #debug-panel-content {
          flex: 1;
          overflow-y: auto;
        }
        
        .debug-entry {
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(55, 65, 81, 0.5);
        }
        
        .debug-time {
          color: #94a3b8;
          font-size: 10px;
          margin-bottom: 2px;
        }
        
        .debug-message {
          color: #4facfe;
          margin-bottom: 2px;
        }
        
        .debug-data {
          color: #f8fafc;
          background-color: rgba(31, 41, 55, 0.5);
          padding: 5px;
          border-radius: 4px;
          white-space: pre-wrap;
          font-size: 10px;
          max-height: 100px;
          overflow-y: auto;
        }
      `;
      document.head.appendChild(style);
      
      const panel = document.createElement('div');
      panel.id = 'debug-panel';
      panel.innerHTML = `
        <div id="debug-panel-header">
          <div id="debug-panel-title">Instanti8 Debug Panel</div>
          <div id="debug-panel-actions">
            <button id="debug-clear">Clear</button>
            <button id="debug-minimize">Minimize</button>
          </div>
        </div>
        <div id="debug-panel-content"></div>
      `;
      document.body.appendChild(panel);
      
      document.getElementById('debug-clear').addEventListener('click', () => {
        const content = document.getElementById('debug-panel-content');
        content.innerHTML = '';
      });
      
      let minimized = false;
      document.getElementById('debug-minimize').addEventListener('click', () => {
        const content = document.getElementById('debug-panel-content');
        const button = document.getElementById('debug-minimize');
        
        if (minimized) {
          panel.style.height = '300px';
          content.style.display = 'block';
          button.textContent = 'Minimize';
        } else {
          panel.style.height = '40px';
          content.style.display = 'none';
          button.textContent = 'Expand';
        }
        
        minimized = !minimized;
      });
      
      debugLog('Debug mode activated', { 
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
    });
  }
  
  if (DEBUG_MODE) {
    const originalFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
      const startTime = performance.now();
      debugLog(`Fetch request started: ${url}`, { 
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body
      });
      
      try {
        const response = await originalFetch(url, options);
        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);
        
        const clone = response.clone();
        let responseData;
        try {
          responseData = await clone.json();
        } catch (e) {
          responseData = 'Non-JSON response';
        }
        
        debugLog(`Fetch response (${duration}ms): ${url}`, { 
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData
        });
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);
        
        debugLog(`Fetch error (${duration}ms): ${url}`, { 
          error: error.message,
          stack: error.stack
        });
        
        throw error;
      }
    };
  }
  
  window.debugUtils = {
    isDebugMode: DEBUG_MODE,
    log: debugLog,
    
    logFormData: function(form) {
      if (!DEBUG_MODE) return;
      
      const formData = new FormData(form);
      const data = {};
      
      for (const [key, value] of formData.entries()) {
        data[key] = key.toLowerCase().includes('password') ? '********' : value;
      }
      
      debugLog('Form data', data);
    },
    
    logValidationError: function(field, message) {
      if (!DEBUG_MODE) return;
      
      debugLog('Validation error', { field, message });
    },
    
    logAuthEvent: function(event, details) {
      if (!DEBUG_MODE) return;
      
      debugLog(`Auth event: ${event}`, details);
    }
  };
})();
