/**
 * Test-data bridge to ns-tdm shared RESTlet.
 * Seeds a clean, deterministic dataset into SB before a spec and tears it
 * down after — so screenshots and assertions are stable across runs.
 *
 * Scenario IDs use the format 'PREFIX:scenario_name' (e.g. 'WMS:item_fulfillment').
 * The returned runId must be passed to teardown() unchanged.
 *
 * @author Wichit Wongta
 */
import { APIRequestContext } from '@playwright/test';

const TDM_URL = process.env.TDM_URL!;

async function call(request: APIRequestContext, body: object) {
  const res = await request.post(TDM_URL, {
    data: body,
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok()) throw new Error(`ns-tdm failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function seed(
  request: APIRequestContext,
  scenario: string
): Promise<{ runId: string; records: Record<string, number> }> {
  return call(request, { scenario });
}

export async function teardown(request: APIRequestContext, runId: string): Promise<void> {
  await call(request, { runId });
}
