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

const errorModule = { exports: {}, Error };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', 'src/utils/error.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, errorModule);

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
  const modules = { react: hooksReact, '@/components/common/QueryError': { QueryError }, '@/components/common/AnimatedList': { AnimatedList }, '@/components/common/ShowcaseRankingPreview': { ShowcaseRankingPreview: stub }, '@/components/common/Button': { Button }, '@/utils/error': errorModule.exports, '@/utils/authSession': { getAuthSessionVersion: () => 0 }, ...dependencies };
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

const ownedGameProps = { isOpen: true, onClose() {}, identifier: 'Tester', username: 'Tester', isReadOnly: false };
const unsyncedGame = { ...game, totalAchievements: undefined };
function ownedAchievementsHarness(request, games = [unsyncedGame]) {
  return harness('src/components/modals/GuestUserGamesModal.tsx', 'GuestUserGamesModal', {
    '@/store/useShowcaseStore': { useShowcaseStore: () => ({ achievementDetail: null }) },
    '@/api/showcase': { getPublicShowcaseGamesApi: async () => ({ games }) },
    '@/api/game': { getGameAchievementsApi: request },
  }, ownedGameProps);
}
const achievementButton = (tree) => elements(tree, node => node.type === 'button' && ['업적 불러오기', '다시 시도'].includes(node.props.children))[0];

test('G003 is visible as a retryable failure and is never turned into no achievements', async () => {
  let calls = 0;
  const h = ownedAchievementsHarness(async () => {
    if (++calls === 1) throw { response: { data: { code: 'G003', message: 'Steam API failure' } } };
    return { appId: 1, totalAchievements: 0, achievedAchievements: 0, achievementRate: null };
  });
  h.render(); await flush(); let tree = h.render();
  await achievementButton(tree).props.onClick(); tree = h.render();
  const alerts = elements(tree, node => node.props.role === 'alert');
  assert.equal(alerts.length, 1);
  assert.match(alerts[0].props.children, /Steam에서 업적 정보를 가져오지 못했습니다/);
  assert.equal(elements(tree, node => node.props.children === '이 게임에는 등록된 도전과제가 없습니다.').length, 0);
  assert.equal(achievementButton(tree).props.children, '다시 시도');
  await achievementButton(tree).props.onClick(); tree = h.render();
  assert.equal(elements(tree, node => node.props.role === 'alert').length, 0);
  assert.equal(elements(tree, node => node.props.children === '이 게임에는 등록된 도전과제가 없습니다.').length, 1);
  assert.equal(achievementButton(tree), undefined);
  assert.equal(calls, 2);
  h.unmount();
});

test('a double click before rerender starts only one achievement request', async () => {
  let calls = 0;
  const pending = deferred();
  const h = ownedAchievementsHarness(() => { calls++; return pending.promise; });
  h.render(); await flush(); const tree = h.render();
  const loading = achievementButton(tree).props.onClick();
  await achievementButton(tree).props.onClick();
  assert.equal(calls, 1);
  pending.resolve({ appId: 1, totalAchievements: 0, achievedAchievements: 0, achievementRate: null });
  await loading;
  h.unmount();
});

for (const fails of [false, true]) {
  test(`closing and reopening ignores the old achievement ${fails ? 'failure' : 'success'} without clearing a new request`, async () => {
    const calls = [];
    const h = ownedAchievementsHarness(() => { const p = deferred(); calls.push(p); return p.promise; });
    h.render(); await flush(); let tree = h.render();
    const oldRequest = achievementButton(tree).props.onClick();
    h.render({ ...ownedGameProps, isOpen: false });
    h.render(ownedGameProps); await flush(); tree = h.render();
    const newRequest = achievementButton(tree).props.onClick();
    if (fails) calls[0].reject(new Error('old error'));
    else calls[0].resolve({ appId: 1, totalAchievements: 0, achievedAchievements: 0, achievementRate: null });
    await oldRequest; tree = h.render();
    assert.equal(elements(tree, node => node.props.role === 'alert').length, 0);
    assert.equal(achievementButton(tree), undefined);
    assert.equal(elements(tree, node => node.props.children === '이 게임에는 등록된 도전과제가 없습니다.').length, 0);
    calls[1].resolve({ appId: 1, totalAchievements: 5, achievedAchievements: 2, achievementRate: 40 });
    await newRequest; tree = h.render();
    assert.equal(elements(tree, node => node.props.children === '도전과제 달성 현황').length, 1);
    h.unmount();
  });
}

test('an already loaded zero-achievement game does not offer another request', async () => {
  let calls = 0;
  const h = ownedAchievementsHarness(async () => { calls++; }, [game]);
  h.render(); await flush(); const tree = h.render();
  assert.equal(achievementButton(tree), undefined);
  assert.equal(calls, 0);
  assert.equal(elements(tree, node => node.props.children === '이 게임에는 등록된 도전과제가 없습니다.').length, 1);
  h.unmount();
});

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

const rankingUser = { id: 1, username: 'Me', avatarUrl: '', isPublic: true };
const ownRank = { rank: 101, userId: 1, username: 'Me', avatarUrl: '', likeCount: 0, totalGamesCount: 12, isLiked: false, isPublic: true };
const rankingResponse = (overrides = {}) => ({ content: [], myRanking: null, hasNext: false, nextCursorLikeCount: null, nextCursorUserId: null, ...overrides });
function personalRankingHarness(auth, calls) {
  return harness('src/pages/ShowcaseRankingPage.tsx', 'ShowcaseRankingPage', {
    '@/store/useAuthStore': { useAuthStore: () => auth },
    '@/api/ranking': { getShowcaseRankingsApi: (...args) => { const request = deferred(); calls.push({ args, ...request }); return request.promise; } },
    '@/api/showcase': { toggleShowcaseLikeApi: async () => { throw Error('Unexpected like mutation'); } },
  });
}
const personalBar = tree => elements(tree, node => node.type === 'section' && node.props['aria-label'] === '내 랭킹')[0];
const hasLabel = (tree, label) => elements(tree, node => node.props['aria-label'] === label).length > 0;

test('the personal bar stays visible through loading, failure and retry without inventing zero counts', async () => {
  const calls = [], auth = { user: rankingUser, isAuthenticated: true };
  const h = personalRankingHarness(auth, calls);
  let tree = h.render();
  assert.ok(personalBar(tree));
  assert.equal(elements(personalBar(tree), node => node.props.role === 'status')[0].props.children, '조회 중');
  calls[0].reject(Error('offline')); await flush(); tree = h.render();
  assert.ok(personalBar(tree));
  assert.ok(hasLabel(personalBar(tree), '순위 확인 불가'));
  assert.ok(hasLabel(personalBar(tree), '좋아요 확인 불가'));
  assert.equal(hasLabel(personalBar(tree), '비공개 쇼케이스'), false);
  assert.equal(elements(personalBar(tree), node => node.props.role === 'status')[0].props.children, '확인 불가');
  h.find(tree, QueryError)[0].props.onRetry(); h.render();
  calls[1].resolve(rankingResponse({ myRanking: ownRank })); await flush(); tree = h.render();
  assert.ok(hasLabel(personalBar(tree), '순위 101위'));
  assert.ok(hasLabel(personalBar(tree), '좋아요 0개'));
  h.unmount();
});

test('missing myRanking uses the logged-in user row when available, otherwise keeps an unknown bar', async () => {
  for (const content of [[ownRank], []]) {
    const calls = [], h = personalRankingHarness({ user: rankingUser, isAuthenticated: true }, calls);
    h.render(); calls[0].resolve(rankingResponse({ content })); await flush();
    const bar = personalBar(h.render());
    assert.ok(bar);
    assert.ok(hasLabel(bar, content.length ? '순위 101위' : '순위 확인 불가'));
    assert.equal(hasLabel(bar, '비공개 쇼케이스'), false);
    h.unmount();
  }
});

test('a private personal ranking shows a lock and the actual like count', async () => {
  const calls = [], h = personalRankingHarness({ user: { ...rankingUser, isPublic: false }, isAuthenticated: true }, calls);
  h.render(); calls[0].resolve(rankingResponse({ myRanking: { ...ownRank, rank: null, isPublic: false, likeCount: 7 } })); await flush();
  const bar = personalBar(h.render());
  assert.ok(hasLabel(bar, '비공개 쇼케이스'));
  assert.ok(hasLabel(bar, '좋아요 7개'));
  h.unmount();
});

test('pagination with null myRanking keeps the personal ranking from the first page', async () => {
  const calls = [], h = personalRankingHarness({ user: rankingUser, isAuthenticated: true }, calls);
  h.render(); calls[0].resolve(rankingResponse({ myRanking: ownRank, content: [{ ...ownRank, userId: 2 }], hasNext: true, nextCursorLikeCount: 0, nextCursorUserId: 2 })); await flush();
  h.render(); h.observers.findLast(observer => observer.connected).callback([{ isIntersecting: true }]); h.render();
  calls[1].resolve(rankingResponse()); await flush();
  assert.ok(hasLabel(personalBar(h.render()), '순위 101위'));
  h.unmount();
});

test('account changes cannot show the former user ranking and logout hides the entire personal region', async () => {
  const calls = [], auth = { user: rankingUser, isAuthenticated: true }, h = personalRankingHarness(auth, calls);
  h.render(); calls[0].resolve(rankingResponse({ myRanking: ownRank, content: [ownRank] })); await flush();
  assert.ok(hasLabel(personalBar(h.render()), '순위 101위'));
  auth.user = { ...rankingUser, id: 2, username: 'New account' };
  let tree = h.render();
  assert.ok(hasLabel(personalBar(tree), '순위 확인 불가'));
  assert.equal(hasLabel(personalBar(tree), '순위 101위'), false);
  // Even an incorrectly scoped response cannot expose another account's rank.
  calls[1].resolve(rankingResponse({ myRanking: ownRank, content: [ownRank] })); await flush(); tree = h.render();
  assert.ok(hasLabel(personalBar(tree), '순위 확인 불가'));
  auth.user = null; auth.isAuthenticated = false;
  assert.equal(personalBar(h.render()), undefined);
  h.unmount();
});

const publicPreview = (overrides = {}) => ({
  user: { id: 2, username: 'Haneul', isPublic: true },
  stats: { totalFolders: 3 },
  rootFolders: [
    { name: 'Second', positionX: 1, positionY: 0, games: [{ appId: 20, name: 'Second game', positionX: 0, positionY: 0 }] },
    { name: 'First', positionX: 0, positionY: 0, games: [
      { appId: 20, name: 'Second game', positionX: 1, positionY: 0 },
      { appId: 10, name: 'First game', positionX: 0, positionY: 0 },
    ], childFolders: [{ name: 'Child', positionX: 0, positionY: 0, games: [{ appId: 30, name: 'Child game', positionX: 0, positionY: 0 }] }] },
  ],
  ...overrides,
});
function previewHarness(request, props = { userId: 2, username: 'Haneul' }, authSession = () => 0) {
  return harness('src/components/common/ShowcaseRankingPreview.tsx', 'ShowcaseRankingPreview', {
    '@/api/showcase': { getPublicShowcaseApi: request },
    '@/utils/authSession': { getAuthSessionVersion: authSession },
  }, props);
}
const previewButton = (tree) => elements(tree, node => node.type === 'button')[0];
const previewGames = (tree) => elements(tree, node => node.props.game).map(node => node.props.game.appId);

test('only the first three ranking previews are automatic; other rows need a user action', async () => {
  const calls = [], h = personalRankingHarness({ user: rankingUser, isAuthenticated: true }, calls);
  const content = Array.from({ length: 5 }, (_, i) => ({ ...ownRank, userId: i + 2, rank: i + 1, username: `Player ${i}` }));
  h.render(); calls[0].resolve(rankingResponse({ content })); await flush();
  const list = h.find(h.render(), AnimatedList)[0];
  content.forEach((item, i) => {
    const row = list.props.renderItem(item, i);
    const preview = elements(row, node => node.props.username === item.username && 'autoLoad' in node.props)[0];
    assert.equal(preview.props.autoLoad, i < 3);
  });
  h.unmount();
  let requests = 0;
  const manual = previewHarness(async () => { requests++; return publicPreview(); });
  const tree = manual.render();
  assert.equal(requests, 0);
  assert.equal(manual.observers.length, 0);
  previewButton(tree).props.onClick(); await flush();
  assert.equal(requests, 1);
  manual.unmount();
});

test('automatic preview waits for visibility, deduplicates effect replay and keeps the loaded result', async () => {
  let calls = 0;
  const pending = deferred();
  const h = previewHarness(() => { calls++; return pending.promise; }, { userId: 2, username: 'Haneul', autoLoad: true });
  h.render();
  assert.equal(calls, 0);
  h.observers[0].callback([{ isIntersecting: false }]);
  assert.equal(calls, 0);
  h.observers[0].callback([{ isIntersecting: true }]);
  h.replayEffects(); h.render();
  h.observers.findLast(observer => observer.connected).callback([{ isIntersecting: true }]);
  assert.equal(calls, 1);
  pending.resolve(publicPreview()); await flush();
  const tree = h.render(); h.render();
  assert.deepEqual(previewGames(tree), [10, 20, 30], 'real games follow folder positions, include children, and are unique');
  assert.ok(elements(tree, node => node.props.children === 'First · Second').length);
  assert.equal(calls, 1);
  assert.equal(h.observers.filter(observer => observer.connected).length, 0);
  h.unmount();
});

test('manual preview deduplicates rapid clicks and offers a local retry after failure', async () => {
  const calls = [];
  const h = previewHarness(() => { const request = deferred(); calls.push(request); return request.promise; });
  const initial = h.render(), click = previewButton(initial).props.onClick;
  click(); click();
  assert.equal(calls.length, 1);
  calls[0].reject(Error('offline')); await flush();
  let tree = h.render();
  assert.ok(elements(tree, node => node.props.children === '미리보기를 불러오지 못했습니다.').length);
  assert.equal(previewButton(tree).props.children, '다시 시도');
  previewButton(tree).props.onClick();
  assert.equal(calls.length, 2);
  calls[1].resolve(publicPreview()); await flush(); tree = h.render();
  assert.deepEqual(previewGames(tree), [10, 20, 30]);
  assert.equal(previewButton(tree), undefined);
  h.unmount();
});

test('a private or mismatched showcase response never exposes its preview contents', async () => {
  for (const [user, expected] of [
    [{ id: 2, isPublic: false }, '비공개로 전환된 쇼케이스입니다.'],
    [{ id: 99, isPublic: true }, '미리보기를 불러오지 못했습니다.'],
  ]) {
    const h = previewHarness(async () => publicPreview({ user }));
    previewButton(h.render()).props.onClick(); await flush();
    const tree = h.render();
    assert.ok(elements(tree, node => node.props.children === expected).length);
    assert.deepEqual(previewGames(tree), []);
    assert.equal(elements(tree, node => node.props.children === 'First · Second').length, 0);
    h.unmount();
  }
});

test('an empty showcase preview uses actual empty content and encoded navigation', async () => {
  const { Link } = require('react-router-dom');
  const name = 'A/B 한글';
  const h = previewHarness(async () => publicPreview({ rootFolders: [], stats: { totalFolders: 0 } }), { userId: 2, username: name });
  previewButton(h.render()).props.onClick(); await flush();
  const tree = h.render();
  assert.deepEqual(previewGames(tree), []);
  assert.ok(elements(tree, node => node.props.children === '아직 배치된 폴더가 없습니다.').length);
  assert.equal(h.find(tree, Link)[0].props.to, `/showcase/${encodeURIComponent(name)}`);
  h.unmount();
});

test('late preview responses cannot replace a new owner or clear its pending request', async () => {
  const calls = [];
  const h = previewHarness((name) => { const request = deferred(); calls.push({ name, ...request }); return request.promise; });
  previewButton(h.render()).props.onClick();
  const props = { userId: 3, username: 'Roon' };
  previewButton(h.render(props)).props.onClick();
  calls[0].resolve(publicPreview()); await flush();
  let tree = h.render();
  assert.deepEqual(previewGames(tree), []);
  assert.equal(previewButton(tree), undefined, 'the new request remains loading');
  calls[1].resolve(publicPreview({ user: { id: 3, isPublic: true } })); await flush();
  tree = h.render();
  assert.deepEqual(previewGames(tree), [10, 20, 30]);
  assert.equal(calls.length, 2);
  h.unmount();
});

test('preview requests started in an old auth session or unmounted view cannot publish their response', async () => {
  let session = 0;
  const pending = deferred();
  const h = previewHarness(() => pending.promise, undefined, () => session);
  previewButton(h.render()).props.onClick();
  session = 1;
  pending.resolve(publicPreview()); await flush();
  assert.deepEqual(previewGames(h.render()), []);
  assert.ok(previewButton(h.render()));
  h.unmount();
  const late = deferred(), removed = previewHarness(() => late.promise);
  previewButton(removed.render()).props.onClick(); removed.unmount();
  late.resolve(publicPreview()); await flush();
  assert.deepEqual(previewGames(removed.render()), []);
});

test('own received likes are passive and the personal dock opens the owner workspace', async () => {
  const { Link } = require('react-router-dom');
  const calls = [], h = personalRankingHarness({ user: rankingUser, isAuthenticated: true }, calls);
  h.render(); calls[0].resolve(rankingResponse({ content: [ownRank], myRanking: ownRank })); await flush();
  const tree = h.render(), row = h.find(tree, AnimatedList)[0].props.renderItem(ownRank, 0);
  const ownLikes = elements(row, node => node.props['aria-label'] === '내 쇼케이스 좋아요 0개')[0];
  assert.equal(ownLikes.type, 'span');
  assert.equal(ownLikes.props.onClick, undefined);
  assert.equal(h.find(personalBar(tree), Link)[0].props.to, '/');
  h.unmount();
});

function interactiveRankingHarness(auth, requests, likes, session) {
  return harness('src/pages/ShowcaseRankingPage.tsx', 'ShowcaseRankingPage', {
    '@/store/useAuthStore': { useAuthStore: () => auth },
    '@/api/ranking': { getShowcaseRankingsApi: () => { const request = deferred(); requests.push(request); return request.promise; } },
    '@/api/showcase': { toggleShowcaseLikeApi: () => { const request = deferred(); likes.push(request); return request.promise; } },
    '@/utils/authSession': { getAuthSessionVersion: session },
  });
}
const renderedLike = (h) => {
  const list = h.find(h.render(), AnimatedList)[0];
  return elements(list.props.renderItem(list.props.items[0], 0), node => node.type === 'button')[0];
};
const likeEvent = { preventDefault() {}, stopPropagation() {} };

test('like clicks before rerender send one mutation and restore the control after success', async () => {
  const requests = [], likes = [], auth = { user: rankingUser, isAuthenticated: true };
  const h = interactiveRankingHarness(auth, requests, likes, () => 0);
  h.render(); requests[0].resolve(rankingResponse({ content: [{ ...ownRank, userId: 2 }] })); await flush();
  const click = renderedLike(h).props.onClick;
  const first = click(likeEvent); await click(likeEvent);
  assert.equal(likes.length, 1);
  assert.equal(renderedLike(h).props.disabled, true);
  likes[0].resolve({ liked: true, totalLikeCount: 1 }); await first;
  assert.equal(renderedLike(h).props.disabled, false);
  assert.equal(renderedLike(h).props['aria-pressed'], true);
  assert.match(renderedLike(h).props['aria-label'], /현재 1개/);
  h.unmount();
});

test('an old account like completion neither mutates the new list nor clears its pending control', async () => {
  const requests = [], likes = [], auth = { user: rankingUser, isAuthenticated: true };
  let session = 0;
  const h = interactiveRankingHarness(auth, requests, likes, () => session);
  const content = [{ ...ownRank, userId: 2 }];
  h.render(); requests[0].resolve(rankingResponse({ content })); await flush();
  const old = renderedLike(h).props.onClick(likeEvent);
  auth.user = { ...rankingUser, id: 7 }; session++;
  h.render(); requests[1].resolve(rankingResponse({ content })); await flush();
  const fresh = renderedLike(h).props.onClick(likeEvent);
  likes[0].resolve({ liked: true, totalLikeCount: 99 }); await old;
  assert.equal(renderedLike(h).props.disabled, true);
  assert.match(renderedLike(h).props['aria-label'], /현재 0개/);
  likes[1].resolve({ liked: true, totalLikeCount: 1 }); await fresh;
  assert.equal(renderedLike(h).props.disabled, false);
  assert.match(renderedLike(h).props['aria-label'], /현재 1개/);
  h.unmount();
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
