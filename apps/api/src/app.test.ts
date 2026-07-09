import Fastify from 'fastify';

describe('Fastify server', () => {
  it('can create and inject a health endpoint', async () => {
    const app = Fastify();

    app.get('/api/health', async () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
    }));

    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();

    await app.close();
  });

  it('returns 404 for unknown routes', async () => {
    const app = Fastify();
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/nonexistent',
    });

    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
