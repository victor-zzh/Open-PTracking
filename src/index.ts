import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { analyzeRouter } from './routes/analyze';
import { errorHandler } from './middleware/error';

const app = new Hono();

// Error handling
app.use('*', errorHandler);

// CORS middleware
app.use('*', async (c, next) => {
  c.res.headers.set('Access-Control-Allow-Origin', '*');
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: c.res.headers });
  }
  await next();
});

// API routes
app.route('/api', analyzeRouter);

// Serve static frontend
app.get('/*', serveStatic({ root: './public' }));

const port = parseInt(process.env.PORT || '3000');

console.log(`\n🚀 Open-PTracking server starting...`);
console.log(`   http://localhost:${port}\n`);

export default {
  port,
  fetch: app.fetch,
};
