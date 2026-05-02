#!/usr/bin/env node
/**
 * Pin a directory to IPFS via Pinata using legacy API key auth.
 *
 *   PINATA_API_KEY=... PINATA_SECRET_API_KEY=... 
 *     node scripts/pin-to-pinata.js ./_ipfs_deploy inneREvolution-website
 *
 * Outputs CID to GITHUB_OUTPUT when present.
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const dir = process.argv[2] || './_ipfs_deploy';
const pinName = process.argv[3] || 'inneREvolution-website';
const apiKey = (process.env.PINATA_API_KEY || '').trim();
const apiSecret = (process.env.PINATA_SECRET_API_KEY || '').trim();

if (!apiKey || !apiSecret) {
  console.error('❌ PINATA_API_KEY and/or PINATA_SECRET_API_KEY env vars are missing');
  console.error(`   API key length: ${apiKey.length}, Secret length: ${apiSecret.length}`);
  process.exit(1);
}
if (!fs.existsSync(dir)) {
  console.error(`❌ Directory not found: ${dir}`);
  process.exit(1);
}

console.log(`🔑 API key: ${apiKey.slice(0, 8)}... (${apiKey.length} chars)`);

function walk(current, baseParent, out = []) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) walk(full, baseParent, out);
    else if (entry.isFile()) {
      out.push({
        absolute: full,
        relative: path.relative(baseParent, full).split(path.sep).join('/'),
      });
    }
  }
  return out;
}

const absDir = path.resolve(dir);
const baseParent = path.dirname(absDir);
const rootName = path.basename(absDir);
const files = walk(absDir, baseParent);

console.log(`📦 Pinning ${files.length} files; root folder = "${rootName}/"`);

const form = new FormData();
for (const f of files) {
  form.append('file', fs.createReadStream(f.absolute), { filepath: f.relative });
}
form.append(
  'pinataMetadata',
  JSON.stringify({ name: pinName, keyvalues: { source: 'github-actions' } })
);
form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

form.submit(
  {
    protocol: 'https:',
    host: 'api.pinata.cloud',
    path: '/pinning/pinFileToIPFS',
    headers: {
      pinata_api_key: apiKey,
      pinata_secret_api_key: apiSecret,
    },
  },
  (err, res) => {
    if (err) {
      console.error('❌ Network error:', err.message);
      process.exit(1);
    }
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        console.error(`❌ Pinata HTTP ${res.statusCode}`);
        console.error(body);
        process.exit(1);
      }
      let result;
      try {
        result = JSON.parse(body);
      } catch (e) {
        console.error('❌ Invalid JSON response:', body);
        process.exit(1);
      }
      const cid = result.IpfsHash;
      if (!cid) {
        console.error('❌ No IpfsHash in response:', result);
        process.exit(1);
      }
      console.log('✅ Pinned successfully');
      console.log(`CID: ${cid}`);
      console.log(`PinSize: ${result.PinSize} bytes`);
      console.log(`Timestamp: ${result.Timestamp}`);
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `hash=${cid}\n`);
      }
    });
  }
);
