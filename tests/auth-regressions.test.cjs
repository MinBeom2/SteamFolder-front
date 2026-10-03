const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const sourcePath = path.join(__dirname, '../src/store/useAuthStore.ts');
const compiledSource = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const loginResponse = (id) => ({
  accessToken: `access-${id}`,
  refreshToken: `refresh-${id}`,
  userId: id,
  steamId: String(id),
  username: `login-${id}`,
  avatarUrl: null,
  themeColor: '#00f',
  isNewUser: false,
});

const serverProfile = (id, isPublic) => ({
  id,
  steamId: String(id),
  username: `server-${id}`,
  avatarUrl: null,
  themeColor: '#123456',
  isPublic,
});

function createHarness() {
  const sessionContext = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/authSession.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, sessionContext);
  const storage = new Map();
  const requests = [];
  const localStorage = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  const authApi = {
    getMyProfileApi: () => new Promise((resolve, reject) => {
      requests.push({ resolve, reject });
    }),
  };
  const context = {
    exports: {},
    localStorage,
    console: { ...console, warn: () => {} },
    require: (moduleName) => {
      if (moduleName === 'zustand') return require('zustand');
      if (moduleName === '@/api/auth') return authApi;
      if (moduleName === '@/utils/authSession') return sessionContext.exports;
      throw new Error(`Unexpected auth store dependency: ${moduleName}`);
    },
  };

  vm.runInNewContext(compiledSource, context, { filename: sourcePath });
  return { store: context.exports.useAuthStore, storage, requests };
}

test('login waits for the server profile and preserves a private showcase', async () => {
  const { store, storage, requests } = createHarness();
  const pending = store.getState().setAuth(loginResponse(7));

  assert.equal(store.getState().user, null);
  assert.equal(store.getState().isAuthenticated, false);
  assert.equal(store.getState().isLoading, true);
  assert.equal(storage.get('accessToken'), 'access-7');

  const profile = serverProfile(7, false);
  requests[0].resolve(profile);
  await pending;

  assert.equal(store.getState().user, profile);
  assert.equal(store.getState().user.isPublic, false);
  assert.equal(store.getState().isAuthenticated, true);
  assert.equal(store.getState().isLoading, false);
});

for (const failure of [{ response: { status: 503 } }, new Error('Network Error')]) {
  test(`startup ${failure.response ? 'server failure' : 'network failure'} preserves saved tokens and can retry`, async () => {
    const { store, storage, requests } = createHarness();
    storage.set('accessToken', 'saved-access');
    storage.set('refreshToken', 'saved-refresh');
    const initialization = store.getState().initializeAuth();
    requests[0].reject(failure);
    await initialization;
    assert.equal(storage.get('accessToken'), 'saved-access');
    assert.equal(storage.get('refreshToken'), 'saved-refresh');
    assert.equal(store.getState().isAuthenticated, false);
    assert.equal(store.getState().isInitialized, true);
    assert.ok(store.getState().error);
    const previousError = store.getState().error;
    const retry = store.getState().initializeAuth();
    assert.equal(store.getState().isLoading, true);
    assert.equal(store.getState().error, previousError);
    requests[1].resolve(serverProfile(15, false));
    await retry;
    assert.equal(store.getState().isAuthenticated, true);
    assert.equal(store.getState().user.isPublic, false);
    assert.equal(store.getState().error, null);
  });
}

test('an invalid saved session clears tokens rather than displaying a network retry', async () => {
  const { store, storage, requests } = createHarness();
  storage.set('accessToken', 'invalid-access');
  storage.set('refreshToken', 'invalid-refresh');
  const initialization = store.getState().initializeAuth();
  requests[0].reject({ response: { status: 401 } });
  await initialization;
  assert.equal(storage.size, 0);
  assert.equal(store.getState().error, null);
  assert.equal(store.getState().isAuthenticated, false);
});

test('public login and startup restoration use the verified server profile', async () => {
  const first = createHarness();
  const pending = first.store.getState().setAuth(loginResponse(8));
  first.requests[0].resolve(serverProfile(8, true));
  await pending;
  assert.equal(first.store.getState().user.isPublic, true);

  const restored = createHarness();
  restored.storage.set('accessToken', first.storage.get('accessToken'));
  restored.storage.set('refreshToken', first.storage.get('refreshToken'));
  const initializing = restored.store.getState().initializeAuth();
  restored.requests[0].resolve(serverProfile(8, false));
  await initializing;

  assert.equal(restored.store.getState().isInitialized, true);
  assert.equal(restored.store.getState().isAuthenticated, true);
  assert.equal(restored.store.getState().user.isPublic, false);
});

test('failed login profile verification removes pending tokens and rejects login', async () => {
  const { store, storage, requests } = createHarness();
  const pending = store.getState().setAuth(loginResponse(9));
  const failure = { response: { status: 503 } };
  const rejected = assert.rejects(pending, (error) => error === failure);
  requests[0].reject(failure);
  await rejected;

  assert.equal(storage.size, 0);
  assert.equal(store.getState().user, null);
  assert.equal(store.getState().isAuthenticated, false);
  assert.equal(store.getState().isLoading, false);

  await store.getState().initializeAuth();
  assert.equal(requests.length, 1);
  assert.equal(store.getState().isAuthenticated, false);
});

test('logout prevents a late login profile from restoring the session', async () => {
  const { store, storage, requests } = createHarness();
  const pending = store.getState().setAuth(loginResponse(10));
  const cancelled = assert.rejects(pending, /로그인이 취소되었습니다/);
  store.getState().logout();
  requests[0].resolve(serverProfile(10, false));
  await cancelled;

  assert.equal(store.getState().user, null);
  assert.equal(store.getState().isAuthenticated, false);
  assert.equal(storage.size, 0);
});

test('an older login failure cannot remove a newer verified session', async () => {
  const { store, storage, requests } = createHarness();
  const oldLogin = store.getState().setAuth(loginResponse(11));
  const failure = { response: { status: 401 } };
  const oldRejected = assert.rejects(oldLogin, (error) => error === failure);
  const newLogin = store.getState().setAuth(loginResponse(12));
  requests[1].resolve(serverProfile(12, false));
  await newLogin;
  requests[0].reject(failure);
  await oldRejected;

  assert.equal(store.getState().user.id, 12);
  assert.equal(store.getState().isAuthenticated, true);
  assert.equal(storage.get('accessToken'), 'access-12');
  assert.equal(storage.get('refreshToken'), 'refresh-12');
});

test('an older startup verification failure cannot log out a newer login', async () => {
  const { store, storage, requests } = createHarness();
  storage.set('accessToken', 'old-access');
  storage.set('refreshToken', 'old-refresh');
  const oldInitialization = store.getState().initializeAuth();
  const newLogin = store.getState().setAuth(loginResponse(13));
  requests[1].resolve(serverProfile(13, false));
  await newLogin;
  requests[0].reject({ response: { status: 503 } });
  await oldInitialization;

  assert.equal(store.getState().user.id, 13);
  assert.equal(store.getState().isAuthenticated, true);
  assert.equal(storage.get('accessToken'), 'access-13');
});

test('a late fetchProfile response cannot restore a logged-out session', async () => {
  const { store, storage, requests } = createHarness();
  storage.set('accessToken', 'old-access');
  storage.set('refreshToken', 'old-refresh');
  const pendingProfile = store.getState().fetchProfile();
  store.getState().logout();
  requests[0].resolve(serverProfile(14, true));
  await pendingProfile;

  assert.equal(store.getState().user, null);
  assert.equal(store.getState().isAuthenticated, false);
  assert.equal(storage.size, 0);
});
