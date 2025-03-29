class InstantiateSDK {
  constructor(config) {
    this.apiUrl = config.apiUrl || 'http://localhost:3000/api';
    this.token = null;
    this.refreshToken = null;
    this.userId = null;
    this.socket = null;
    this.subscriptions = new Map();
  }
  
  async register(email, password, metadata = {}) {
    try {
      const response = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, metadata })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      this.token = data.token;
      this.refreshToken = data.refreshToken;
      this.userId = data.userId;
      
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }
  
  async login(email, password) {
    try {
      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      this.token = data.token;
      this.refreshToken = data.refreshToken;
      this.userId = data.userId;
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }
  
  async refreshAuth() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Token refresh failed');
      }
      
      this.token = data.token;
      this.refreshToken = data.refreshToken;
      
      return data;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }
  
  logout() {
    this.token = null;
    this.refreshToken = null;
    this.userId = null;
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.subscriptions.clear();
  }
  
  async connectToRealTimeDB() {
    if (!this.token) {
      throw new Error('Not authenticated');
    }
    
    if (typeof io === 'undefined') {
      throw new Error('Socket.IO client not found');
    }
    
    this.socket = io(`${this.apiUrl.replace('/api', '')}/rtdb`, {
      auth: {
        token: this.token
      }
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to real-time database');
      
      for (const [path, callbacks] of this.subscriptions.entries()) {
        this.socket.emit('subscribe', path);
      }
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from real-time database');
    });
    
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
    
    this.socket.on('data_update', ({ path, data }) => {
      const callbacks = this.subscriptions.get(path) || [];
      for (const callback of callbacks) {
        callback(data);
      }
    });
  }
  
  ref(path) {
    const self = this;
    return {
      async get() {
        if (!self.token) {
          throw new Error('Not authenticated');
        }
        
        try {
          const response = await fetch(`${self.apiUrl}/database/${path}`, {
            headers: {
              'Authorization': `Bearer ${self.token}`
            }
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || 'Failed to get data');
          }
          
          return data.data;
        } catch (error) {
          console.error('Get data error:', error);
          throw error;
        }
      },
      
      async set(value, accessRules) {
        if (!self.token) {
          throw new Error('Not authenticated');
        }
        
        try {
          const response = await fetch(`${self.apiUrl}/database/${path}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${self.token}`
            },
            body: JSON.stringify({ value, accessRules })
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || 'Failed to set data');
          }
          
          return data;
        } catch (error) {
          console.error('Set data error:', error);
          throw error;
        }
      },
      
      async update(updates) {
        if (!self.token) {
          throw new Error('Not authenticated');
        }
        
        try {
          const response = await fetch(`${self.apiUrl}/database/${path}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${self.token}`
            },
            body: JSON.stringify(updates)
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || 'Failed to update data');
          }
          
          return data;
        } catch (error) {
          console.error('Update data error:', error);
          throw error;
        }
      },
      
      async remove() {
        if (!self.token) {
          throw new Error('Not authenticated');
        }
        
        try {
          const response = await fetch(`${self.apiUrl}/database/${path}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${self.token}`
            }
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || 'Failed to remove data');
          }
          
          return data;
        } catch (error) {
          console.error('Remove data error:', error);
          throw error;
        }
      },
      
      async getRules() {
        if (!self.token) {
          throw new Error('Not authenticated');
        }
        
        try {
          const response = await fetch(`${self.apiUrl}/database/rules/${path}`, {
            headers: {
              'Authorization': `Bearer ${self.token}`
            }
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || 'Failed to get rules');
          }
          
          return data;
        } catch (error) {
          console.error('Get rules error:', error);
          throw error;
        }
      },
      
      async setRules(rules) {
        if (!self.token) {
          throw new Error('Not authenticated');
        }
        
        try {
          const response = await fetch(`${self.apiUrl}/database/rules/${path}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${self.token}`
            },
            body: JSON.stringify(rules)
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || 'Failed to set rules');
          }
          
          return data;
        } catch (error) {
          console.error('Set rules error:', error);
          throw error;
        }
      },
      
      on(eventType, callback) {
        if (!self.token) {
          throw new Error('Not authenticated');
        }
        
        if (!self.socket) {
          throw new Error('Not connected to real-time database');
        }
        
        if (eventType !== 'value') {
          throw new Error('Only "value" event type is supported');
        }
        
        if (!self.subscriptions.has(path)) {
          self.subscriptions.set(path, []);
          self.socket.emit('subscribe', path);
        }
        
        self.subscriptions.get(path).push(callback);
        
        return {
          off: function() {
            if (!self.token) {
              throw new Error('Not authenticated');
            }
            
            if (!self.socket) {
              throw new Error('Not connected to real-time database');
            }
            
            const callbacks = self.subscriptions.get(path) || [];
            const index = callbacks.indexOf(callback);
            
            if (index !== -1) {
              callbacks.splice(index, 1);
            }
            
            if (callbacks.length === 0) {
              self.subscriptions.delete(path);
              self.socket.emit('unsubscribe', path);
            }
          }
        };
      },
      
      child(childPath) {
        const fullPath = path === '/' ? `/${childPath}` : `${path}/${childPath}`;
        return self.ref(fullPath);
      }
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = InstantiateSDK;
} else {
  window.InstantiateSDK = InstantiateSDK;
}
