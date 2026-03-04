// Phusion Passenger entry point for the Next.js dashboard
// cPanel "Setup Node.js App" → Application startup file: server.js
//
// Requires: `npm run build` with output: 'standalone' in next.config.js
// After build, run once:
//   cp -r .next/static .next/standalone/.next/static
//   cp -r public .next/standalone/public   (if public/ dir exists)

'use strict';

const path = require('path');

// Next.js standalone server reads PORT and HOSTNAME from env.
// Passenger supplies process.env.PORT automatically.
process.env.PORT = process.env.PORT || '3000';
process.env.HOSTNAME = '0.0.0.0';

// The standalone server.js must be run from the standalone directory so it
// can resolve the bundled node_modules and .next assets correctly.
process.chdir(path.join(__dirname, '.next', 'standalone'));

require('./.next/standalone/server.js');
