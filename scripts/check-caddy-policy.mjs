import { readFileSync } from 'node:fs';

const source = readFileSync('Caddyfile', 'utf8');
const policies = [...source.matchAll(/Content-Security-Policy\s+"([^"]+)"/g)]
  .map((match) => match[1]);

if (policies.length !== 1) {
  throw new Error(`Expected one Content-Security-Policy, found ${policies.length}`);
}

const policy = policies[0];
for (const directive of [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob: https://image.tmdb.org",
]) {
  if (!policy.includes(directive)) throw new Error(`Missing required CSP directive: ${directive}`);
}

if (/img-src[^;]*(?:\shttps?:\s|\s\*)/.test(policy)) {
  throw new Error('Wildcard image sources are not allowed');
}
if (!source.includes('Referrer-Policy "no-referrer"')) {
  throw new Error('Referrer-Policy must remain no-referrer');
}
