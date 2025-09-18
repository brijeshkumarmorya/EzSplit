import config from './config.js';

const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET', 
  'MONGO_URI'
];

export const validateConfig = () => {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  
  // Validate JWT secrets are strong enough
  if (config.jwtSecret.length < 32) {
    console.error('JWT_SECRET must be at least 32 characters long');
    process.exit(1);
  }
  
  if (config.jwtRefreshSecret.length < 32) {
    console.error('JWT_REFRESH_SECRET must be at least 32 characters long');
    process.exit(1);
  }
  
  console.log('✅ Configuration validation passed');
};