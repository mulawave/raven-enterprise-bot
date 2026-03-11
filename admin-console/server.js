// Phusion Passenger entry point for the Next.js admin console.
// Runs the built app from the project root so the active build manifest and
// static chunk directory stay in sync.

'use strict';

const http = require('http');
const next = require('next');

const port = parseInt(process.env.PORT, 10) || 3001;
const hostname = process.env.HOSTNAME || '0.0.0.0';

const app = next({
	dev: false,
	dir: __dirname,
	hostname,
	port,
});

const handle = app.getRequestHandler();

app.prepare()
	.then(() => {
		http
			.createServer((request, response) => handle(request, response))
			.listen(port, hostname, (error) => {
				if (error) throw error;
			});
	})
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
