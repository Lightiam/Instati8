const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const jwtSecret = crypto.randomBytes(32).toString('hex');
const refreshTokenSecret = crypto.randomBytes(32).toString('hex');

const envPath = path.resolve(process.cwd(), '.env');

let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (error) {
  console.error('Error reading .env file:', error.message);
  process.exit(1);
}

envContent = envContent.replace(/JWT_SECRET=.*$/m, `JWT_SECRET=${jwtSecret}`);
envContent = envContent.replace(/REFRESH_TOKEN_SECRET=.*$/m, `REFRESH_TOKEN_SECRET=${refreshTokenSecret}`);

try {
  fs.writeFileSync(envPath, envContent);
  console.log('JWT secrets generated and updated in .env file');
} catch (error) {
  console.error('Error writing .env file:', error.message);
  process.exit(1);
}
