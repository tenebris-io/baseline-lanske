import dotenv from 'dotenv';
dotenv.config();

import { getDb } from './db/schema';
import { createApp } from './server';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

// Initialize DB (creates tables if they don't exist)
getDb();

const app = createApp();

app.listen(PORT, () => {
  console.log(`Fiercely Diabetic — Dexcom pipeline running on http://localhost:${PORT}`);
  console.log(`  → Authorize: http://localhost:${PORT}/auth/dexcom`);
  console.log(`  → Status:   http://localhost:${PORT}/status`);
});
