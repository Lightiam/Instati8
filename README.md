# Instantiate.dev

Dynamic database on the fly with real-time database and authentication services.

## Features

- **Authentication Service**: Secure user management with JWT authentication
- **Real-time Database**: Redis-based data storage with WebSocket updates
- **Security Rules Engine**: Fine-grained access control for data
- **Client SDK**: Firebase-compatible API for easy integration

## Tech Stack

- Node.js and Express
- Redis for database and real-time updates
- Socket.IO for WebSocket communication
- JWT for authentication
- Docker for containerized deployment

## Getting Started

### Using Docker Compose (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/instantiate.dev.git
   cd instantiate.dev
   ```

2. Generate JWT secrets:
   ```bash
   npm run generate-keys
   ```

3. Start the application:
   ```bash
   docker-compose up -d
   ```

4. Access the application at http://localhost:3000

### Manual Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/instantiate.dev.git
   cd instantiate.dev
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Make sure Redis is installed and running:
   ```bash
   sudo apt-get update
   sudo apt-get install redis-server
   sudo systemctl start redis-server
   ```

4. Generate JWT secrets:
   ```bash
   npm run generate-keys
   ```

5. Start the application:
   ```bash
   npm start
   ```

6. For development with auto-restart:
   ```bash
   npm run dev
   ```

## Client SDK Usage

```javascript
// Initialize Instantiate SDK
const instantiate = new InstantiateSDK({
  apiUrl: 'http://your-domain.com/api'
});

// Authentication
await instantiate.register('user@example.com', 'password123');
await instantiate.login('user@example.com', 'password123');

// Real-time database
await instantiate.connectToRealTimeDB();

// Get data
const data = await instantiate.ref('/users/123').get();

// Set data
await instantiate.ref('/users/123').set({ name: 'John Doe' });

// Update data
await instantiate.ref('/users/123').update({ age: 30 });

// Delete data
await instantiate.ref('/users/123').remove();

// Listen for changes
const unsubscribe = instantiate.ref('/users/123').on('value', (data) => {
  console.log('Data changed:', data);
});

// Stop listening
unsubscribe.off();

// Logout
instantiate.logout();
```

## Security Rules

Security rules control access to your data. By default, data is only accessible to its owner.

Example rules:

```javascript
// Allow public read access but only owner can write
await instantiate.ref('/posts/123').setRules({
  public: 'true',
  publicRead: 'true',
  publicWrite: 'false'
});

// Get current rules
const rules = await instantiate.ref('/posts/123').getRules();
```

## License

MIT
