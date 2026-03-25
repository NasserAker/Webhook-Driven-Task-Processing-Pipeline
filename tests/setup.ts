import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root before any test module initialises
dotenv.config({ path: path.join(__dirname, '../.env') });

// Override with test-specific values if needed
process.env.NODE_ENV = 'test';