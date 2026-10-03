const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const axios = require('axios');

const flush = () => new Promise(setImmediate);
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// Real Axios interceptors and request replay, with a controlled in-memory adapter.
function harness() {
  const storage = new Map([['accessToken', 'old-access'], ['refreshToken', 'old-refresh']]);
  const requests = [], refreshes = [], events = [], cache = new Map();
  const axiosModule = {
    ...axios,
    create(options) {
      return axios.create({ ...options, adapter(config) {
        const pending = deferred();
        requests.push({ config, ...pending });
        return pending.promise;
      } });
    },
    post(...args) {
      const pending = deferred();
      refreshes.push({ args, ...pending });
      return pending.promise;
    },
  };
  function load(relativePath) {
    if (cache.has(relativePath)) return cache.get(relativePath);
    const exports = {};
    cache.set(relativePath, exports);
    const filename = path.join(__dirname, '..', relativePath);
    const source = fs.readFileSync(filename, 'utf8').replace('import.meta.env.VITE_API_BASE_URL', "''");
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(output, {
      exports, Error, Event,
      localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
      window: { dispatchEvent: event => events.push(event.type) },
      require(name) {
        if (name === 'axios') return { ...axiosModule, default: axiosModule };
        if (name === '@/utils/authSession') return load('src/utils/authSession.ts');
        throw Error(`Unexpected client dependency: ${name}`);
      },
    }, { filename });
    return exports;
  }
  const client = load('src/api/client.ts').apiClient;
  const session = load('src/utils/authSession.ts');
  return { client, session, storage, requests, refreshes, events };
}

function unauthorized(request) {
  request.reject(new axios.AxiosError('Request failed with status code 401', 'ERR_BAD_REQUEST', request.config, {}, {
    status: 401, config: request.config, data: {}, headers: {}, statusText: 'Unauthorized',
  }));
}
function success(request) {
  request.resolve({ status: 200, data: { value: 'verified' }, config: request.config, headers: {}, statusText: 'OK' });
}
function rotate(request) {
  request.resolve({ data: { data: { accessToken: 'rotated-access', refreshToken: 'rotated-refresh' } } });
}

test('concurrent unauthorized requests share one rotation and replay once each', async () => {
  const h = harness();
  const first = h.client.get('/one'), second = h.client.get('/two');
  await flush();
  unauthorized(h.requests[0]); unauthorized(h.requests[1]); await flush();
  assert.equal(h.refreshes.length, 1);
  assert.equal(h.refreshes[0].args[2].timeout, 15000);
  rotate(h.refreshes[0]); await flush();
  assert.equal(h.requests.length, 4);
  for (const request of h.requests.slice(2)) {
    assert.equal(request.config.headers.Authorization, 'Bearer rotated-access');
    success(request);
  }
  await Promise.all([first, second]);
});

test('a queued request rejected again does not start a refresh loop', async () => {
  const h = harness();
  const first = h.client.get('/one'), second = h.client.get('/two');
  const rejected = assert.rejects(second);
  await flush(); unauthorized(h.requests[0]); unauthorized(h.requests[1]); await flush();
  rotate(h.refreshes[0]); await flush();
  success(h.requests[2]); await first;
  unauthorized(h.requests[3]); await rejected;
  assert.equal(h.refreshes.length, 1);
  assert.equal(h.storage.size, 0);
  assert.deepEqual(h.events, ['auth:logout']);
});

test('a delayed 401 from the previous token reuses the already rotated token', async () => {
  const h = harness();
  const first = h.client.get('/one'), second = h.client.get('/two');
  await flush(); unauthorized(h.requests[0]); await flush();
  rotate(h.refreshes[0]); await flush(); success(h.requests[2]); await first;
  unauthorized(h.requests[1]); await flush();
  assert.equal(h.refreshes.length, 1);
  assert.equal(h.requests[3].config.headers.Authorization, 'Bearer rotated-access');
  success(h.requests[3]); await second;
});

test('logout during token rotation cannot restore tokens or replay the old request', async () => {
  const h = harness();
  const pending = h.client.get('/private');
  const rejected = assert.rejects(pending, /로그인 상태가 변경/);
  await flush(); unauthorized(h.requests[0]); await flush();
  h.session.invalidateAuthSession(); h.storage.clear();
  rotate(h.refreshes[0]); await rejected;
  assert.equal(h.storage.size, 0);
  assert.equal(h.requests.length, 1);
});

test('an old rotation failure cannot clear a newer login', async () => {
  const h = harness();
  const pending = h.client.get('/private');
  const rejected = assert.rejects(pending);
  await flush(); unauthorized(h.requests[0]); await flush();
  h.session.invalidateAuthSession();
  h.storage.set('accessToken', 'new-login'); h.storage.set('refreshToken', 'new-refresh');
  h.refreshes[0].reject({ response: { status: 401 } }); await rejected;
  assert.equal(h.storage.get('accessToken'), 'new-login');
  assert.equal(h.storage.get('refreshToken'), 'new-refresh');
  assert.equal(h.events.length, 0);
});

for (const failure of [{ response: { status: 503 } }, new Error('Network Error')]) {
  test(`transient rotation ${failure.response ? '503' : 'network failure'} keeps tokens and permits a later retry`, async () => {
    const h = harness();
    const pending = h.client.get('/private');
    const rejected = assert.rejects(pending);
    await flush(); unauthorized(h.requests[0]); await flush();
    h.refreshes[0].reject(failure); await rejected;
    assert.equal(h.storage.get('accessToken'), 'old-access');
    assert.equal(h.storage.get('refreshToken'), 'old-refresh');
    assert.equal(h.events.length, 0);
    const retry = h.client.get('/private');
    await flush(); unauthorized(h.requests[1]); await flush();
    assert.equal(h.refreshes.length, 2);
    rotate(h.refreshes[1]); await flush(); success(h.requests[2]); await retry;
  });
}

test('invalid refresh credentials expire the current session', async () => {
  const h = harness();
  const pending = h.client.get('/private');
  const rejected = assert.rejects(pending);
  await flush(); unauthorized(h.requests[0]); await flush();
  h.refreshes[0].reject({ response: { status: 401 } }); await rejected;
  assert.equal(h.storage.size, 0);
  assert.deepEqual(h.events, ['auth:logout']);
});

test('a successful response from a previous session is rejected before reaching consumers', async () => {
  const h = harness();
  const pending = h.client.get('/private');
  const rejected = assert.rejects(pending, /로그인 상태가 변경/);
  await flush(); h.session.invalidateAuthSession(); success(h.requests[0]); await rejected;
});

test('old rotation completion does not detach a newer session rotation', async () => {
  const h = harness();
  const old = h.client.get('/old'); const oldRejected = assert.rejects(old);
  await flush(); unauthorized(h.requests[0]); await flush();
  h.session.invalidateAuthSession(); h.storage.set('accessToken', 'new-login'); h.storage.set('refreshToken', 'new-refresh');
  const current = h.client.get('/current');
  await flush(); unauthorized(h.requests[1]); await flush();
  h.refreshes[0].reject({ response: { status: 401 } }); await oldRejected;
  const queued = h.client.get('/queued');
  await flush(); unauthorized(h.requests[2]); await flush();
  assert.equal(h.refreshes.length, 2);
  rotate(h.refreshes[1]); await flush();
  h.requests.slice(3).forEach(success); await Promise.all([current, queued]);
  assert.equal(h.storage.get('accessToken'), 'rotated-access');
});
