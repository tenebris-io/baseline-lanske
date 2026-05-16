import dotenv from 'dotenv';
dotenv.config();

import { getDb } from './db/schema';
import { createApp } from './server';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

// Initialize DB (creates tables if they don't exist)
getDb();

const app = createApp();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Fiercely Diabetic — Dexcom pipeline running on http://0.0.0.0:${PORT} (all interfaces)`);
  console.log(`  → Authorize: http://localhost:${PORT}/auth/dexcom`);
  console.log(`  → Status:   http://localhost:${PORT}/status`);
});
