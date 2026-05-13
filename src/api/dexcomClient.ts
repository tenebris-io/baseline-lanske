import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { getValidAccessToken, refreshAccessToken } from '../auth/dexcom';
import { markUserNeedsReauth } from '../db/store';

const BASE_URL = process.env.DEXCOM_BASE_URL!;

const RETRY_DELAYS_MS = [1000, 3000, 9000]; // exponential-ish backoff

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function dexcomGet<T>(
  userId: number,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  let attempt = 0;

  while (true) {
    let accessToken: string;
    try {
      accessToken = await getValidAccessToken(userId);
    } catch (err) {
      throw new Error(`Cannot get access token for user ${userId}: ${(err as Error).message}`);
    }

    const config: AxiosRequestConfig = {
      headers: { Authorization: `Bearer ${accessToken}` },
      params,
      timeout: 30000, // 30s — prevents silent hangs
    };

    try {
      const response: AxiosResponse<T> = await axios.get(`${BASE_URL}${path}`, config);
      return response.data;
    } catch (err: unknown) {
      if (!axios.isAxiosError(err)) throw err;

      const status = err.response?.status;

      if (status === 401) {
        if (attempt === 0) {
          // Force a refresh and retry once
          try {
            await refreshAccessToken(userId);
          } catch {
            markUserNeedsReauth(userId);
            throw new Error(`Token refresh failed for user ${userId}. Re-authentication required.`);
          }
          attempt++;
          continue;
        }
        markUserNeedsReauth(userId);
        throw new Error(`401 after token refresh for user ${userId}. Re-authentication required.`);
      }

      if (status === 429) {
        const retryAfter = parseInt(err.response?.headers['retry-after'] ?? '60', 10);
        console.warn(`[dexcomClient] 429 rate limited on ${path} — waiting ${retryAfter}s`);
        await sleep(retryAfter * 1000);
        attempt++;
        continue;
      }

      if (status === 400) {
        console.error(`[dexcomClient] 400 Bad Request — path: ${path}`, {
          params,
          response: err.response?.data,
        });
        throw new Error(`400 Bad Request for ${path}: ${JSON.stringify(err.response?.data)}`);
      }

      // Network / 5xx — retry with backoff
      if (attempt < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[attempt];
        console.warn(`[dexcomClient] ${status ?? 'network error'} on ${path} — retry in ${delay}ms`);
        await sleep(delay);
        attempt++;
        continue;
      }

      throw new Error(
        `Request failed after ${attempt + 1} attempts — ${path}: ${err.message}`
      );
    }
  }
}
