#!/usr/bin/env node
/**
 * Pin a directory to IPFS via Pinata using the modern JWT auth.
 * Run from CI:
 *   PINATA_JWT=... node scripts/pin-to-pinata.js ./_ipfs_deploy inneREvolution-website
 *
 * Outputs the CID to stdout, and writes it to $GITHUB_OUTPUT (key: hash) and
 * $GITHUB_STEP_SUMMARY when those env vars are present.
 */

const fs = require('fs');
const path = require('path');

const dir = process.argv[2] || './_ipfs_deploy';
const pinName = process.argv[3] || 'inneREvolution-website';
const jwt = process.env.PINATA_JWT;

if (!jwt) {
  console.error('❌ PINATA_JWT env var is missing');
  process.exit(1);
}
if (!fs.existsSync(dir)) {
  console.error(`❌ Directory not found: ${dir}`);
  process.exit(1);
}

// Recursively collect all files relative to the parent of `dir`
// so the IPFS root is the directory itself (e.g. _ipfs_deploy/index.html → _ipfs_deploy/index.html)
function walk(current, baseParent, out = []) {
  const entries = fs.readdirSync(current, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) {
      walk(full, baseParent, out);
    } else if (entry.isFile()) {
      out.push({
        absolute: full,
        relative: path.relative(baseParent, full).split(path.sep).join('/'),
      });
    }
  }
  return out;
}

async function main() {
  const FormData = require('form-data');

  const baseParent = path.resolve(path.dirname(path.resolve(dir)));
  const files = walk(path.resolve(dir), baseParent);
  console.log(`📦 Pinning ${files.length} files from ${dir}/`);

  const form = new FormData();
  for (const f of files) {
    form.append('file', fs.createReadStream(f.absolute), { filepath: f.relative });
  }
  form.append(
    'pinataMetadata',
    JSON.stringify({ name: pinName, keyvalues: { source: 'github-actions' } })
  );
  form.append('pinataOptions', JSON.stringify({ cidVersion: 1, wrapWithDirectory: false }));

  // Pinata recommends pinFileToIPFS for directory uploads
  const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

  // Use built-in fetch (Node 18+) with form-data's getBuffer/getHeaders
  const headers = {
    Authorization: `Bearer ${jwt}`,
    ...form.getHeaders(),
  };

  // Stream upload via http(s) module to avoid loading everything in memory
  const https = require('https');
  const { URL } = require('url');
  const u = new URL(url);

  const responseBody = await new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: 'POST',
        host: u.host,
        path: u.pathname,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`Pinata HTTP ${res.statusCode}: ${data}`));
          }
        });
      }
    );
    req.on('error', reject);
    form.pipe(req);
  });

  const result = JSON.parse(responseBody);
  const cid = result.IpfsHash;
  if (!cid) {
    console.error('❌ No IpfsHash in response:', result);
    process.exit(1);
  }

  console.log(`✅ Pinned successfully`);
  console.log(`CID: ${cid}`);
  console.log(`PinSize: ${result.PinSize} bytes`);
  console.log(`Timestamp: ${result.Timestamp}`);

  // Expose CID to subsequent workflow steps
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `hash=${cid}\n`);
  }
}

main().catch((err) => {
  console.error('❌ Pin failed:', err.message);
  process.exit(1);
});
