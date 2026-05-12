import axios from 'axios';
import { getDb } from '../db/schema';

const BASE_URL = process.env.DEXCOM_BASE_URL!;
const CLIENT_ID = process.env.DEXCOM_CLIENT_ID!;
const CLIENT_SECRET = process.env.DEXCOM_CLIENT_SECRET!;
const REDIRECT_URI = process.env.DEXCOM_REDIRECT_URI!;

const TOKEN_ENDPOINT = `${BASE_URL}/v2/oauth2/token`;
const AUTH_ENDPOINT = `${BASE_URL}/v2/oauth2/login`;

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export function buildAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'offline_access',
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenSet> {
  const response = await axios.post(
    TOKEN_ENDPOINT,
    new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const { access_token, refresh_token, expires_in } = response.data;
  return {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: Date.now() + expires_in * 1000,
  };
}

export async function refreshAccessToken(userId: number): Promise<TokenSet> {
  const db = getDb();
  const row = db
    .prepare('SELECT refresh_token FROM dexcom_tokens WHERE user_id = ?')
    .get(userId) as { refresh_token: string } | undefined;

  if (!row) {
    throw new Error(`No token record found for user ${userId}`);
  }

  const response = await axios.post(
    TOKEN_ENDPOINT,
    new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: row.refresh_token,
      grant_type: 'refresh_token',
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const { access_token, refresh_token, expires_in } = response.data;
  const tokens: TokenSet = {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: Date.now() + expires_in * 1000,
  };

  db.prepare(
    `UPDATE dexcom_tokens
     SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = datetime('now')
     WHERE user_id = ?`
  ).run(tokens.accessToken, tokens.refreshToken, tokens.expiresAt, userId);

  return tokens;
}

export async function getValidAccessToken(userId: number): Promise<string> {
  const db = getDb();
  const row = db
    .prepare('SELECT access_token, expires_at FROM dexcom_tokens WHERE user_id = ?')
    .get(userId) as { access_token: string; expires_at: number } | undefined;

  if (!row) {
    throw new Error(`No token record found for user ${userId}. Re-authentication required.`);
  }

  if (Date.now() + REFRESH_BUFFER_MS >= row.expires_at) {
    const refreshed = await refreshAccessToken(userId);
    return refreshed.accessToken;
  }

  return row.access_token;
}
