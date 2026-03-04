// Phusion Passenger entry point for the NestJS API
// cPanel "Setup Node.js App" → Application startup file: app.js
//
// Passenger sets process.env.PORT automatically.
// NestJS main.ts already reads: process.env.PORT || 4000
// Nothing else is needed here — just bootstrap the compiled dist.

'use strict';

require('./dist/apps/api/src/main.js');
