// Phusion Passenger entry point for the Next.js admin console
// cPanel "Setup Node.js App" → Application startup file: server.js
//
// Requires: `npm run build` with output: 'standalone' in next.config.js
// After build, run once:
//   cp -r .next/static .next/standalone/.next/static
//   cp -r public .next/standalone/public   (if public/ dir exists)

'use strict';

const path = require('path');

// Passenger supplies process.env.PORT automatically.
process.env.PORT = process.env.PORT || '3001';
process.env.HOSTNAME = '0.0.0.0';

process.chdir(path.join(__dirname, '.next', 'standalone'));

require('./.next/standalone/server.js');
