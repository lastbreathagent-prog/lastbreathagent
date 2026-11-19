// Posts to X (API v2) with OAuth 1.0a user-context signing. No dependencies.
import crypto from 'node:crypto';

const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export function oauthHeader(method, url, x, nonce = crypto.randomBytes(16).toString('hex'), timestamp = Math.floor(Date.now() / 1000)) {
  const params = {
    oauth_consumer_key: x.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(timestamp),
    oauth_token: x.accessToken,
    oauth_version: '1.0',
  };
  // JSON body is not part of the signature for v2 endpoints.
  const paramString = Object.keys(params).sort().map((k) => `${enc(k)}=${enc(params[k])}`).join('&');
  const base = [method.toUpperCase(), enc(url), enc(paramString)].join('&');
  const key = `${enc(x.apiSecret)}&${enc(x.accessSecret)}`;
  params.oauth_signature = crypto.createHmac('sha1', key).update(base).digest('base64');
  return 'OAuth ' + Object.keys(params).sort().map((k) => `${enc(k)}="${enc(params[k])}"`).join(', ');
}

export async function post(text, cfg, log = console) {
  const hasKeys = cfg.x.apiKey && cfg.x.apiSecret && cfg.x.accessToken && cfg.x.accessSecret;
  if (cfg.dryRun || !hasKeys) {
    log.info?.(`[X dry-run] ${text}`);
    return { id: null, dryRun: true, text };
  }
  const url = 'https://api.x.com/2/tweets';
  const res = await fetch(url, {
    method: 'POST',
    headers: { authorization: oauthHeader('POST', url, cfg.x), 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`X ${res.status}: ${await res.text()}`);
  const data = await res.json();
  log.info?.(`[X] posted ${data.data?.id}: ${text}`);
  return { id: data.data?.id, dryRun: false, text };
}
