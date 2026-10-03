const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const React = require('react');
const ts = require('typescript');

const stub = () => null;
const QueryError = () => null;
const AnimatedList = () => null;
const Button = () => null;

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function elements(tree, predicate) {
  const found = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!React.isValidElement(node)) return;
    if (predicate(node)) found.push(node);
    visit(node.props.children);
    visit(node.props.footer);
    visit(node.props.title);
  }
  visit(tree);
  return found;
}

// Execute actual component callbacks/effects with controlled hook state and API
// promises. Browser verification separately covers rendering and focus behavior.
function harness(relativePath, exportName, dependencies, initialProps = {}, dev = true) {
  const hooks = [], pendingEffects = [], observers = [];
  let hookIndex = 0, props = initialProps;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooksReact = {
    ...React,
    useState(initial) {
      const index = hookIndex++;
      if (!hooks[index]) hooks[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [hooks[index].value, (next) => {
        hooks[index].value = typeof next === 'function' ? next(hooks[index].value) : next;
      }];
    },
    useRef(initial) {
      const index = hookIndex++;
      if (!hooks[index]) hooks[index] = { current: initial };
      return hooks[index];
    },
    useMemo(compute, deps) {
      const index = hookIndex++;
      if (!hooks[index] || !same(hooks[index].deps, deps)) hooks[index] = { deps, value: compute() };
      return hooks[index].value;
    },
    useCallback(callback, deps) { return this.useMemo(() => callback, deps); },
    useEffect(effect, deps) {
      const index = hookIndex++;
      const old = hooks[index];
      if (!old || !same(old.deps, deps)) {
        old?.cleanup?.();
        const slot = hooks[index] = { deps };
        pendingEffects.push(() => { slot.cleanup = effect(); });
      }
    },
  };
  // TS named imports invoke hooks without a receiver.
  hooksReact.useCallback = (callback, deps) => hooksReact.useMemo(() => callback, deps);
  const modules = { react: hooksReact, '@/components/common/QueryError': { QueryError }, '@/components/common/AnimatedList': { AnimatedList }, '@/components/common/Button': { Button }, ...dependencies };
  for (const [folder, name] of [
    ['layout', 'Navbar'], ['layout', 'GuestBanner'], ['common', 'Modal'], ['common', 'LoadingSpinner'],
    ['desktop', 'FolderCard'], ['desktop', 'GameCard'], ['desktop', 'Breadcrumb'],
    ['modals', 'LoginRequiredModal'], ['modals', 'GameDetailModal'], ['modals', 'GuestUserGamesModal'],
  ]) modules[`@/components/${folder}/${name}`] ??= { [name]: stub };
  const filename = path.join(__dirname, '..', relativePath);
  const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.DEV', String(dev));
  const output = ts.transpileModule(source, { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const location = { origin: 'https://steamfolder.example', href: '' };
  const context = {
    exports: {}, URLSearchParams, window: { location }, setTimeout,
    console: { warn() {}, error() {} },
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; this.connected = true; observers.push(this); }
      observe() {}
      unobserve() {}
      disconnect() { this.connected = false; }
    },
    require(name) {
      if (name in modules) return modules[name];
      if (['react/jsx-runtime', 'react-router-dom', 'lucide-react'].includes(name)) return require(name);
      throw new Error(`Unexpected query UI dependency: ${name}`);
    },
  };
  vm.runInNewContext(output, context, { filename });
  const render = (nextProps) => {
    if (nextProps) props = nextProps;
    hookIndex = 0;
    const tree = context.exports[exportName](props);
    // Host refs normally become available before React runs effects.
    elements(tree, node => typeof node.type === 'string').forEach(node => {
      if (node.props.ref && !node.props.ref.current) node.props.ref.current = { scrollTop: 0 };
    });
    pendingEffects.splice(0).forEach(effect => effect());
    return tree;
  };
  return {
    render, observers, location,
    unmount: () => hooks.forEach(hook => hook?.cleanup?.()),
    replayEffects: () => { hooks.forEach(hook => { if (hook && 'cleanup' in hook) { hook.cleanup?.(); hook.deps = null; } }); },
    find: (tree, type) => elements(tree, node => node.type === type),
  };
}

const flush = () => new Promise(setImmediate);
const game = { appId: 1, name: 'RPG Adventure', genres: ['RPG'], playtimeForever: 60, headerImage: '', totalAchievements: 0 };

test('owned-games query retry preserves the current genre, sort and search', async () => {
  const calls = [];
  const h = harness('src/components/modals/GuestUserGamesModal.tsx', 'GuestUserGamesModal', {
    '@/store/useShowcaseStore': { useShowcaseStore: () => ({ achievementDetail: null }) },
    '@/api/showcase': { getPublicShowcaseGamesApi: (...args) => { const request = deferred(); calls.push({ args, ...request }); return request.promise; } },
    '@/api/game': { getGameAchievementsApi: async () => { throw Error('Unexpected mutation'); } },
  }, { isOpen: true, onClose() {}, identifier: 'Haneul', username: 'Haneul' });
  let tree = h.render();
  calls[0].resolve({ games: [game] }); await flush(); tree = h.render();
  h.find(tree, 'input')[0].props.onChange({ target: { value: 'Adventure' } });
  elements(tree, node => node.type === 'button' && node.props.children === 'RPG')[0].props.onClick();
  tree = h.render();
  const recent = elements(tree, node => node.type === 'button' && node.props.title === '최근에 플레이한 순으로 정렬')[0];
  recent.props.onClick(); tree = h.render();
  calls[2].reject(Error('offline')); await flush(); tree = h.render();
  const error = h.find(tree, QueryError)[0];
  assert.ok(error);
  error.props.onRetry(); h.render(); tree = h.render();
  assert.equal(h.find(tree, QueryError)[0].props.isRetrying, true);
  assert.equal(h.find(tree, 'input')[0].props.value, 'Adventure');
  assert.deepEqual(Array.from(calls[3].args[1]), ['RPG']);
  assert.equal(calls[3].args[0], 'Haneul');
  assert.equal(calls[3].args[2], 'recent');
  calls[3].resolve({ games: [game] }); await flush(); tree = h.render();
  assert.equal(h.find(tree, QueryError).length, 0);
  calls[1].reject(Error('obsolete filter failure')); await flush(); tree = h.render();
  assert.equal(h.find(tree, QueryError).length, 0, 'obsolete failure cannot replace the recovered list');
});

test('public folder transient failure retries the same route instead of navigating away', async () => {
  const requests = [], navigations = [];
  const showcase = { user: { id: 2, username: 'Haneul' }, stats: {}, rootFolders: [] };
  const navigate = (...args) => navigations.push(args);
  const h = harness('src/pages/GuestShowcasePage.tsx', 'GuestShowcasePage', {
    'react-router-dom': { ...require('react-router-dom'), useParams: () => ({ identifier: 'Haneul', folderId: '201' }), useNavigate: () => navigate },
    '@/store/useAuthStore': { useAuthStore: () => ({ user: null, isAuthenticated: false }) },
    '@/api/showcase': { getPublicShowcaseApi: async () => showcase },
    '@/api/folder': { getFolderDetailApi: id => { const request = deferred(); requests.push({ id, ...request }); return request.promise; } },
  });
  h.render(); await flush();
  requests[0].reject({ response: { status: 503 } }); await flush();
  let tree = h.render();
  assert.equal(navigations.length, 0);
  h.find(tree, QueryError)[0].props.onRetry(); h.render(); await flush(); tree = h.render();
  assert.equal(h.find(tree, QueryError)[0].props.isRetrying, true);
  assert.equal(requests[1].id, 201);
  requests[1].resolve({ id: 201, name: 'Recovered', games: [], childFolders: [], breadcrumbs: [] }); await flush();
  tree = h.render();
  assert.equal(h.find(tree, QueryError).length, 0);
  assert.equal(navigations.length, 0);
});

test('ranking pagination failure keeps loaded rows, stops automatic retries and retains its cursor', async () => {
  const calls = [];
  const h = harness('src/pages/ShowcaseRankingPage.tsx', 'ShowcaseRankingPage', {
    '@/store/useAuthStore': { useAuthStore: () => ({ user: null, isAuthenticated: false }) },
    '@/api/ranking': { getShowcaseRankingsApi: (...args) => { const request = deferred(); calls.push({ args, ...request }); return request.promise; } },
    '@/api/showcase': { toggleShowcaseLikeApi: async () => { throw Error('Unexpected like mutation'); } },
  });
  h.render();
  const first = { userId: 2, username: 'Haneul', likeCount: 246 };
  calls[0].resolve({ content: [first], nextCursorLikeCount: 246, nextCursorUserId: 2, hasNext: true }); await flush();
  h.render();
  h.observers.findLast(observer => observer.connected).callback([{ isIntersecting: true }]);
  h.render();
  calls[1].reject(Error('offline')); await flush();
  let tree = h.render();
  assert.equal(h.find(tree, AnimatedList)[0].props.items.length, 1);
  assert.equal(h.observers.filter(observer => observer.connected).length, 0);
  const retry = h.find(tree, QueryError)[0].props.onRetry;
  const pending = retry(); retry(); tree = h.render();
  assert.equal(calls.length, 3, 'a second click during the pending retry cannot send another request');
  assert.deepEqual(calls[2].args, [246, 2, 50]);
  assert.equal(h.find(tree, QueryError)[0].props.isRetrying, true);
  calls[2].resolve({ content: [{ userId: 3, username: 'Roon' }], hasNext: false, nextCursorLikeCount: null, nextCursorUserId: null });
  await pending; tree = h.render();
  assert.equal(h.find(tree, AnimatedList)[0].props.items.length, 2);
  assert.equal(h.find(tree, QueryError).length, 0);
});

test('Steam login uses the existing OpenID redirect and production hides the manual login option', () => {
  for (const dev of [false, true]) {
    const h = harness('src/components/auth/SteamLoginButton.tsx', 'SteamLoginButton', {
      '@/store/useShowcaseStore': { useShowcaseStore: () => ({ setDirectLoginModalOpen() {} }) },
    }, { showDemoOption: true }, dev);
    const buttons = h.find(h.render(), Button);
    assert.equal(buttons.length, dev ? 2 : 1);
    buttons[0].props.onClick();
    const destination = new URL(h.location.href);
    assert.equal(destination.origin, 'https://steamcommunity.com');
    assert.equal(destination.pathname, '/openid/login');
    assert.equal(destination.searchParams.get('openid.return_to'), 'https://steamfolder.example/auth/callback');
    assert.equal(destination.searchParams.get('openid.realm'), 'https://steamfolder.example');
  }
});

test('production manual login component renders nothing even if its modal state is open', () => {
  const h = harness('src/components/modals/DirectLoginModal.tsx', 'DirectLoginModal', {
    '@/store/useAuthStore': { useAuthStore: () => ({ setAuth() { throw Error('Unexpected login'); } }) },
    '@/api/auth': { loginWithSteamApi() { throw Error('Unexpected login'); } },
    '@/utils/error': { getErrorMessage: () => 'error' },
  }, { isOpen: true, onClose() {} }, false);
  assert.equal(h.render(), null);
});

test('startup connection failure displays a busy retry and an explicit logout action', () => {
  let retries = 0, logouts = 0;
  const state = { isInitialized: true, isAuthenticated: false, accessToken: 'saved', refreshToken: 'saved-refresh', error: '서버 연결 실패', isLoading: false,
    initializeAuth: () => { retries++; state.isLoading = true; }, logout: () => { logouts++; } };
  const deps = {
    '@/store/useAuthStore': { useAuthStore: () => state },
    '@/store/useThemeStore': { useThemeStore: (() => { const theme = { initializeTheme() {} }; return () => theme; })() },
  };
  for (const page of ['HomePage', 'GuestShowcasePage', 'ShowcaseRankingPage', 'MyPage', 'AuthCallbackPage']) deps[`@/pages/${page}`] = { [page]: stub };
  const h = harness('src/App.tsx', 'App', deps);
  let tree = h.render();
  // The mount effect initializes once; the visible retry explicitly starts another attempt.
  h.find(tree, QueryError)[0].props.onRetry(); tree = h.render();
  assert.equal(retries, 2);
  assert.equal(h.find(tree, QueryError)[0].props.isRetrying, true);
  const logout = h.find(tree, Button)[0];
  assert.equal(logout.props.children, '로그아웃');
  assert.equal(logout.props.disabled, true);
  state.isLoading = false; tree = h.render();
  h.find(tree, Button)[0].props.onClick();
  assert.equal(logouts, 1);
});

function callbackHarness(mode = 'id_res') {
  const login = deferred(), profile = deferred();
  const navigations = [];
  let loginCalls = 0, authCalls = 0;
  const params = new URLSearchParams({ 'openid.mode': mode, 'openid.identity': 'fixture-only' });
  const navigate = (...args) => navigations.push(args);
  const setAuth = () => { authCalls++; return profile.promise; };
  const h = harness('src/pages/AuthCallbackPage.tsx', 'AuthCallbackPage', {
    'react-router-dom': { useSearchParams: () => [params], useNavigate: () => navigate },
    '@/store/useAuthStore': { useAuthStore: () => ({ setAuth }) },
    '@/api/auth': { loginWithSteamApi: () => { loginCalls++; return login.promise; } },
    '@/utils/error': { getErrorMessage: () => '인증 실패' },
  });
  return { ...h, login, profile, navigations, counts: () => ({ loginCalls, authCalls }) };
}

test('leaving the callback before verification finishes prevents starting a new login', async () => {
  const h = callbackHarness(); h.render(); h.unmount();
  h.login.resolve({}); await flush();
  assert.equal(h.counts().authCalls, 0);
  assert.equal(h.navigations.length, 0);
});

test('leaving the callback during profile verification prevents a late navigation', async () => {
  const h = callbackHarness(); h.render();
  h.login.resolve({}); await flush();
  assert.equal(h.counts().authCalls, 1);
  h.unmount(); h.profile.resolve(); await flush();
  assert.equal(h.navigations.length, 0);
});

test('development StrictMode effect replay still completes exactly one Steam login', async () => {
  const h = callbackHarness(); h.render(); h.replayEffects(); h.render();
  h.login.resolve({}); await flush(); h.profile.resolve(); await flush();
  assert.deepEqual(h.counts(), { loginCalls: 1, authCalls: 1 });
  assert.equal(h.navigations.length, 1);
  assert.equal(h.navigations[0][0], '/');
});

test('Steam login cancellation displays a reason without submitting an invalid verification', () => {
  const h = callbackHarness('cancel'); h.render();
  const tree = h.render();
  assert.equal(h.counts().loginCalls, 0);
  assert.ok(elements(tree, node => node.type === 'p' && node.props.children === 'Steam 로그인이 취소되었습니다.').length);
});

function addGameHarness(syncResult, syncFailure = null) {
  const state = {
    userGames: [game], selectedGameAppIds: [1], cooldownSeconds: 0, isSyncingGames: false,
    isAddGameModalOpen: true, isLoadingGames: false, gamesError: null,
    checkCooldown() {}, filterUserGames() { state.gamesError = null; }, loadMoreGames() {},
    syncGames: async () => { if (syncFailure) throw syncFailure; state.gamesError = syncResult?.gamesError; return { syncedGameCount: 2 }; },
  };
  const useShowcaseStore = Object.assign(() => state, { getState: () => state });
  const h = harness('src/components/modals/AddGameModal.tsx', 'AddGameModal', {
    '@/store/useShowcaseStore': { useShowcaseStore },
    '@/utils/error': { getErrorMessage: () => '동기화 쿨다운(5분) 제한 중입니다.' },
  }, { isOpen: true, onClose() {} });
  return { ...h, state };
}

test('add-game sync cooldown failure has visible feedback even without a cooldown response', async () => {
  const h = addGameHarness(null, { response: { data: { code: 'G005' } } });
  const tree = h.render();
  const syncButton = h.find(tree, Button).find(node => node.props.children === '라이브러리 동기화');
  assert.ok(syncButton, 'Locate the actual sync action');
  await syncButton.props.onClick();
  assert.ok(elements(h.render(), node => node.props.children === '동기화 쿨다운(5분) 제한 중입니다.').length);
});

test('successful sync and failed list refresh display query retry guidance without clearing selection', async () => {
  const h = addGameHarness({ gamesError: 'list unavailable' });
  const tree = h.render();
  const syncButton = h.find(tree, Button).find(node => node.props.children === '라이브러리 동기화');
  assert.ok(syncButton);
  await syncButton.props.onClick();
  const updated = h.render();
  assert.ok(h.find(updated, QueryError)[0]);
  assert.ok(elements(updated, node => typeof node.props.children === 'string' && node.props.children.includes('Steam 동기화는 완료했지만')).length);
  assert.deepEqual(h.state.selectedGameAppIds, [1]);
  h.find(updated, QueryError)[0].props.onRetry();
  const recovered = h.render();
  assert.equal(h.find(recovered, QueryError).length, 0);
  assert.equal(elements(recovered, node => typeof node.props.children === 'string' && node.props.children.includes('Steam 동기화는 완료했지만')).length, 0);
  assert.ok(elements(recovered, node => node.props.children === '스팀 게임 2개가 성공적으로 동기화되었습니다!').length);
});
