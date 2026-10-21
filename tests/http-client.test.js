'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { HttpClient } = require('../src/utils/http-client');

test('HttpClient: Successful GET request', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    headers: new Map(),
    text: async () => JSON.stringify([{ title: 'Potassium', version: '2.5.4' }])
  });

  try {
    const client = new HttpClient({ maxRetries: 0 });
    const res = await client.get('https://fake-api.local/executors');
    assert.equal(res.status, 200);
    assert.equal(res.data[0].title, 'Potassium');
  } finally {
    global.fetch = originalFetch;
  }
});

test('HttpClient: Invalid JSON response rejection', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    headers: new Map(),
    text: async () => '<html><body>502 Bad Gateway Cloudflare</body></html>'
  });

  try {
    const client = new HttpClient({ maxRetries: 0 });
    await assert.rejects(
      async () => client.get('https://fake-api.local/bad-json'),
      /Invalid JSON received/
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('HttpClient: 429 Rate Limit with Retry-After', async () => {
  const originalFetch = global.fetch;
  let attempts = 0;

  global.fetch = async () => {
    attempts++;
    if (attempts === 1) {
      return {
        ok: false,
        status: 429,
        headers: new Map([['retry-after', '0']]),
        text: async () => 'Rate limit exceeded'
      };
    }
    return {
      ok: true,
      status: 200,
      headers: new Map(),
      text: async () => JSON.stringify({ success: true })
    };
  };

  try {
    const client = new HttpClient({ maxRetries: 2, initialBackoffMs: 10 });
    const res = await client.get('https://fake-api.local/rate-limited');
    assert.equal(attempts, 2, 'Should retry after 429');
    assert.equal(res.data.success, true);
  } finally {
    global.fetch = originalFetch;
  }
});

test('HttpClient: 500 Server Error with Backoff', async () => {
  const originalFetch = global.fetch;
  let attempts = 0;

  global.fetch = async () => {
    attempts++;
    if (attempts < 3) {
      return {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Map(),
        text: async () => 'Server error'
      };
    }
    return {
      ok: true,
      status: 200,
      headers: new Map(),
      text: async () => JSON.stringify({ recovered: true })
    };
  };

  try {
    const client = new HttpClient({ maxRetries: 3, initialBackoffMs: 10 });
    const res = await client.get('https://fake-api.local/flaky');
    assert.equal(attempts, 3, 'Should retry through transient 503 errors');
    assert.equal(res.data.recovered, true);
  } finally {
    global.fetch = originalFetch;
  }
});

test('HttpClient: Request Deduplication', async () => {
  const originalFetch = global.fetch;
  let fetchCount = 0;

  global.fetch = async () => {
    fetchCount++;
    await new Promise(r => setTimeout(r, 50));
    return {
      ok: true,
      status: 200,
      headers: new Map(),
      text: async () => JSON.stringify({ count: fetchCount })
    };
  };

  try {
    const client = new HttpClient();
    const [p1, p2, p3] = await Promise.all([
      client.get('https://fake-api.local/dedupe'),
      client.get('https://fake-api.local/dedupe'),
      client.get('https://fake-api.local/dedupe')
    ]);

    assert.equal(fetchCount, 1, 'Concurrent requests to identical URL must be deduplicated into 1 network call');
    assert.equal(p1.data.count, 1);
    assert.equal(p2.data.count, 1);
    assert.equal(p3.data.count, 1);
  } finally {
    global.fetch = originalFetch;
  }
});
