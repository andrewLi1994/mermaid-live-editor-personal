import { expect, test } from '@playwright/test';

test.describe('GitHub repo sync', () => {
  test('requires login before serving GitHub account data', async ({ request }) => {
    const me = await request.get('/api/github/me');
    expect(me.status()).toBe(401);

    const repos = await request.get('/api/github/repos');
    expect(repos.status()).toBe(401);
  });
});
