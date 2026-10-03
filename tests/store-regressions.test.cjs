const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const { create } = require('zustand');

const projectRoot = path.resolve(__dirname, '..');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

// Controlled API promises test the real store without real networking or timers.
function loadStore(overrides = {}) {
  const unexpected = (name) => async () => {
    throw new Error(`Unexpected API call: ${name}`);
  };
  const folderApi = Object.fromEntries([
    'getFolderDetailApi', 'createFolderApi', 'updateFolderApi', 'deleteFolderApi',
    'moveFolderApi', 'updatePositionsApi', 'addGameToFolderApi',
    'batchAddFolderGamesApi', 'removeFolderGameApi', 'removeFolderGamesApi',
    'moveGameToAnotherFolderApi', 'batchMoveFolderGamesApi',
  ].map((name) => [name, unexpected(name)]));
  const gameApi = Object.fromEntries([
    'getUserGamesApi', 'getUserGamesCursorApi', 'filterUserGamesApi',
    'syncSteamGamesApi', 'getSyncCooldownApi', 'getGameAchievementsApi',
    'syncGameAchievementsApi',
  ].map((name) => [name, unexpected(name)]));
  const showcaseApi = { getMyShowcaseApi: unexpected('getMyShowcaseApi') };

  folderApi.getFolderDetailApi = async (id) => ({
    id, name: 'Regression folder', themeColor: '#2a475e', positionX: 0,
    positionY: 0, depth: 0, parentFolderId: null, gameCount: 0,
    childFolderCount: 0, childFolders: [], games: [], breadcrumbs: [],
  });
  for (const [name, fn] of Object.entries(overrides)) {
    const target = name in folderApi ? folderApi : name in gameApi ? gameApi : showcaseApi;
    target[name] = fn;
  }

  const dependencies = {
    zustand: { create },
    '@/api/folder': folderApi,
    '@/api/game': gameApi,
    '@/api/showcase': showcaseApi,
    '@/store/useAuthStore': {
      useAuthStore: { getState: () => ({ isAuthenticated: true, user: { id: 1 } }) },
    },
  };
  const moduleCache = new Map();
  function load(relativePath) {
    const filename = path.join(projectRoot, relativePath);
    if (moduleCache.has(filename)) return moduleCache.get(filename).exports;
    const module = { exports: {} };
    moduleCache.set(filename, module);
    const source = fs.readFileSync(filename, 'utf8');
    const { outputText } = ts.transpileModule(source, {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    const context = vm.createContext({
      module,
      exports: module.exports,
      require: (name) => {
        if (name in dependencies) return dependencies[name];
        if (name === '@/utils/error') return load('src/utils/error.ts');
        if (name === '@/utils/authSession') return load('src/utils/authSession.ts');
        throw new Error(`Unexpected module dependency: ${name}`);
      },
      console: { log() {}, warn() {}, error() {} },
      // The store uses these only for presentation toasts and cooldowns.
      setTimeout: () => 1,
      clearTimeout() {},
      setInterval: () => 1,
      clearInterval() {},
      Error,
    });
    new vm.Script(outputText, { filename }).runInContext(context);
    return module.exports;
  }
  const store = load('src/store/useShowcaseStore.ts').useShowcaseStore;
  store.invalidateAuthSession = load('src/utils/authSession.ts').invalidateAuthSession;
  return store;
}

const game = (appId, extra = {}) => ({
  userGameId: appId, appId, name: `Game ${appId}`, playtimeForever: appId * 60,
  headerImage: `https://example.invalid/${appId}.jpg`, genres: ['RPG'], ...extra,
});
const page = (games, extra = {}) => ({
  content: games, nextCursor: null, hasNext: false, totalElements: games.length,
  pageSize: 24, ...extra,
});
const filtered = (games) => ({ totalCount: games.length, games });
const achievements = (appId, achieved = 3) => ({
  appId, gameName: `Game ${appId}`, totalAchievements: 10,
  achievedAchievements: achieved, achievementRate: achieved * 10,
  playtimeForever: appId * 60, achievements: [],
});
const apiError = (message) => ({ response: { data: { message } } });
const plain = (value) => JSON.parse(JSON.stringify(value));
const flush = () => new Promise(setImmediate);

function librarySnapshot(store) {
  const state = store.getState();
  return plain({
    userGames: state.userGames, gamesCursor: state.gamesCursor,
    hasMoreGames: state.hasMoreGames, totalGamesCount: state.totalGamesCount,
    isLoadingGames: state.isLoadingGames, isLoadingMoreGames: state.isLoadingMoreGames,
    gamesError: state.gamesError, selectedGameAppIds: state.selectedGameAppIds,
  });
}

function detailSnapshot(store) {
  const state = store.getState();
  return plain({
    isGameDetailModalOpen: state.isGameDetailModalOpen,
    selectedGameDetail: state.selectedGameDetail, achievementDetail: state.achievementDetail,
    isLoadingGameDetail: state.isLoadingGameDetail,
    isSyncingAchievements: state.isSyncingAchievements, gameDetailError: state.gameDetailError,
  });
}

function prepareAddition(store) {
  store.setState({
    currentFolderId: 101, isAddGameModalOpen: true,
    selectedGameAppIds: [10, 20], userGames: [game(10, { selected: true }), game(20, { selected: true })],
  });
}

test('concurrent game additions share one pending API operation', async () => {
  const request = deferred();
  const calls = [];
  const store = loadStore({ batchAddFolderGamesApi: (...args) => { calls.push(args); return request.promise; } });
  prepareAddition(store);
  let firstSettled = false;
  let secondSettled = false;
  const first = store.getState().addSelectedGamesToFolder().finally(() => { firstSettled = true; });
  const second = store.getState().addSelectedGamesToFolder().finally(() => { secondSettled = true; });
  await flush();
  assert.equal(calls.length, 1);
  assert.deepEqual(plain(calls[0]), [101, { appIds: [10, 20] }]);
  assert.equal(store.getState().isAddingGames, true);
  assert.equal(firstSettled, false);
  assert.equal(secondSettled, false, 'The second caller must await the shared addition');
  request.resolve([]);
  await Promise.all([first, second]);
  assert.equal(store.getState().isAddingGames, false);
  assert.equal(store.getState().isAddGameModalOpen, false);
  assert.deepEqual(plain(store.getState().selectedGameAppIds), []);
  assert.equal(store.getState().userGames.some((item) => item.selected), false);
});

test('a failed shared addition preserves selection and can be retried', async () => {
  const failedRequest = deferred();
  let calls = 0;
  const store = loadStore({ batchAddFolderGamesApi: () => ++calls === 1 ? failedRequest.promise : Promise.resolve([]) });
  prepareAddition(store);
  const first = store.getState().addSelectedGamesToFolder();
  const second = store.getState().addSelectedGamesToFolder();
  const failure = apiError('추가 실패');
  const firstRejection = assert.rejects(first, (error) => error === failure);
  const secondRejection = assert.rejects(second, (error) => error === failure);
  failedRequest.reject(failure);
  await Promise.all([firstRejection, secondRejection]);
  assert.equal(calls, 1);
  assert.equal(store.getState().isAddingGames, false);
  assert.equal(store.getState().isAddGameModalOpen, true);
  assert.deepEqual(plain(store.getState().selectedGameAppIds), [10, 20]);
  assert.equal(store.getState().userGames.every((item) => item.selected), true);
  await store.getState().addSelectedGamesToFolder();
  assert.equal(calls, 2);
  assert.equal(store.getState().isAddGameModalOpen, false);
});

for (const outcome of ['success', 'failure']) {
  test(`late filter A ${outcome} cannot replace filter B or clear its loading state`, async () => {
    const a = deferred();
    const b = deferred();
    let calls = 0;
    const store = loadStore({ filterUserGamesApi: () => ++calls === 1 ? a.promise : b.promise });
    const requestA = store.getState().filterUserGames(['액션']);
    const requestB = store.getState().filterUserGames(['RPG']);
    const pendingB = librarySnapshot(store);
    if (outcome === 'success') a.resolve(filtered([game(10)]));
    else a.reject(apiError('오래된 A 오류'));
    await requestA;
    assert.deepEqual(librarySnapshot(store), pendingB);
    b.resolve(filtered([game(20)]));
    await requestB;
    assert.deepEqual(plain(store.getState().userGames).map((item) => item.appId), [20]);
    assert.equal(store.getState().isLoadingGames, false);
    assert.equal(store.getState().gamesError, null);
  });

  test(`filter B remains unchanged when older filter A ${outcome} arrives afterward`, async () => {
    const a = deferred();
    const b = deferred();
    let calls = 0;
    const store = loadStore({ filterUserGamesApi: () => ++calls === 1 ? a.promise : b.promise });
    const requestA = store.getState().filterUserGames(['액션']);
    const requestB = store.getState().filterUserGames(['RPG']);
    b.resolve(filtered([game(20)]));
    await requestB;
    const acceptedB = librarySnapshot(store);
    if (outcome === 'success') a.resolve(filtered([game(10)]));
    else a.reject(apiError('오래된 A 오류'));
    await requestA;
    assert.deepEqual(librarySnapshot(store), acceptedB);
  });
}

test('concurrent library sync actions share one operation and respect the resulting cooldown', async () => {
  const request = deferred();
  let syncCalls = 0, listCalls = 0;
  const store = loadStore({
    syncSteamGamesApi: () => { syncCalls++; return request.promise; },
    getUserGamesCursorApi: async () => { listCalls++; return page([game(10)]); },
  });
  const first = store.getState().syncGames();
  const second = store.getState().syncGames();
  assert.equal(first, second);
  await flush();
  assert.equal(syncCalls, 1);
  request.resolve({ syncedGameCount: 1 });
  await Promise.all([first, second]);
  assert.equal(listCalls, 1);
  assert.equal(store.getState().cooldownSeconds, 300);
  await assert.rejects(store.getState().syncGames(), /쿨다운/);
  assert.equal(syncCalls, 1);
});

for (const code of ['G003', 'G004']) {
  test(`${code} sync failure preserves library data and permits a later retry`, async () => {
    let calls = 0;
    const failure = { response: { data: { code } } };
    const store = loadStore({
      syncSteamGamesApi: async () => { if (++calls === 1) throw failure; return { syncedGameCount: 2 }; },
      getUserGamesCursorApi: async () => page([game(10), game(20)]),
    });
    store.setState({ userGames: [game(10, { selected: true })], selectedGameAppIds: [10] });
    const before = librarySnapshot(store);
    await assert.rejects(store.getState().syncGames(), error => error === failure);
    assert.deepEqual(librarySnapshot(store), before);
    assert.equal(store.getState().isSyncingGames, false);
    assert.equal(store.getState().cooldownSeconds, 0);
    await store.getState().syncGames();
    assert.equal(calls, 2);
    assert.deepEqual(plain(store.getState().selectedGameAppIds), [10]);
  });
}

test('successful sync with failed filtered refresh preserves cached games and selection; retry only fetches the list', async () => {
  let syncCalls = 0, filterCalls = 0;
  const store = loadStore({
    syncSteamGamesApi: async () => { syncCalls++; return { syncedGameCount: 2 }; },
    filterUserGamesApi: async () => {
      if (++filterCalls === 2) throw apiError('목록 서버 장애');
      return filtered([game(10), game(20)]);
    },
  });
  store.getState().setAddGameModalOpen(true);
  await store.getState().filterUserGames(['RPG'], 'recent');
  store.getState().toggleGameSelection(10);
  const gamesBefore = plain(store.getState().userGames);
  await store.getState().syncGames();
  assert.deepEqual(plain(store.getState().userGames), gamesBefore);
  assert.deepEqual(plain(store.getState().selectedGameAppIds), [10]);
  assert.equal(store.getState().gamesError, '목록 서버 장애');
  await store.getState().filterUserGames(['RPG'], 'recent');
  assert.equal(syncCalls, 1);
  assert.equal(store.getState().gamesError, null);
  assert.equal(store.getState().userGames[0].selected, true);
});

test('successful settings sync keeps cached games when both list endpoints fail', async () => {
  const store = loadStore({
    syncSteamGamesApi: async () => ({ syncedGameCount: 2 }),
    getUserGamesCursorApi: async () => { throw apiError('cursor unavailable'); },
    getUserGamesApi: async () => { throw apiError('list unavailable'); },
  });
  store.setState({ userGames: [game(10)], totalGamesCount: 1 });
  await store.getState().syncGames();
  assert.equal(store.getState().userGames[0].appId, 10);
  assert.equal(store.getState().totalGamesCount, 1);
  assert.equal(store.getState().gamesError, 'list unavailable');
});

for (const cooldownUnavailable of [false, true]) {
  test(`G005 remains visible when cooldown lookup ${cooldownUnavailable ? 'fails' : 'succeeds'}`, async () => {
    const failure = { response: { data: { code: 'G005' } } };
    const store = loadStore({
      syncSteamGamesApi: async () => { throw failure; },
      getSyncCooldownApi: async () => { if (cooldownUnavailable) throw Error('offline'); return { remainingSeconds: 142 }; },
    });
    store.setState({ userGames: [game(10)] });
    await assert.rejects(store.getState().syncGames(), error => error === failure);
    assert.equal(store.getState().isSyncingGames, false);
    assert.equal(store.getState().userGames[0].appId, 10);
    assert.equal(store.getState().cooldownSeconds, cooldownUnavailable ? 0 : 142);
  });
}

test('session changes clear private caches and ignore late library, sync and cooldown responses', async () => {
  const sync = deferred(), filter = deferred(), cooldown = deferred();
  let cursorCalls = 0;
  const store = loadStore({
    syncSteamGamesApi: () => sync.promise,
    filterUserGamesApi: () => filter.promise,
    getSyncCooldownApi: () => cooldown.promise,
    getUserGamesCursorApi: async () => { cursorCalls++; return page([game(10)]); },
  });
  store.setState({ userGames: [game(10)], items: [{ id: 10 }], isAddGameModalOpen: true });
  const pendingFilter = store.getState().filterUserGames();
  const pendingCooldown = store.getState().checkCooldown();
  const pendingSync = store.getState().syncGames();
  const rejected = assert.rejects(pendingSync, /로그인 상태가 변경/);
  await flush();
  store.setState({ cooldownSeconds: 23 });
  store.invalidateAuthSession();
  assert.equal(store.getState().userGames.length, 0);
  assert.equal(store.getState().items.length, 0);
  assert.equal(store.getState().cooldownSeconds, 0);
  filter.resolve(filtered([game(10)])); cooldown.resolve({ remainingSeconds: 142 }); sync.resolve({ syncedGameCount: 1 });
  await Promise.all([pendingFilter, pendingCooldown, rejected]);
  assert.equal(store.getState().userGames.length, 0);
  assert.equal(store.getState().cooldownSeconds, 0);
  assert.equal(cursorCalls, 0);
});

test('an older cooldown check cannot clear the countdown started by a successful sync', async () => {
  const cooldown = deferred();
  const store = loadStore({
    getSyncCooldownApi: () => cooldown.promise,
    syncSteamGamesApi: async () => ({ syncedGameCount: 1 }),
    getUserGamesCursorApi: async () => page([game(10)]),
  });
  const oldCheck = store.getState().checkCooldown();
  await store.getState().syncGames();
  cooldown.resolve({ remainingSeconds: 0 }); await oldCheck;
  assert.equal(store.getState().cooldownSeconds, 300);
});

test('an old sync cannot clear a newer session sync loading state', async () => {
  const old = deferred(), current = deferred();
  let calls = 0;
  const store = loadStore({
    syncSteamGamesApi: () => ++calls === 1 ? old.promise : current.promise,
    getUserGamesCursorApi: async () => page([game(20)]),
  });
  const previous = store.getState().syncGames();
  const rejected = assert.rejects(previous, /로그인 상태가 변경/);
  await flush(); store.invalidateAuthSession();
  const next = store.getState().syncGames(); await flush();
  old.resolve({ syncedGameCount: 1 }); await rejected;
  assert.equal(store.getState().isSyncingGames, true);
  const duplicate = store.getState().syncGames();
  assert.equal(duplicate, next);
  current.resolve({ syncedGameCount: 1 }); await next;
  assert.equal(calls, 2);
  assert.equal(store.getState().userGames[0].appId, 20);
});

test('the current library failure is exposed and a successful retry clears it', async () => {
  let calls = 0;
  const retry = deferred();
  const store = loadStore({
    filterUserGamesApi: () => ++calls === 1
      ? Promise.reject(apiError('게임 목록 오류'))
      : retry.promise,
  });
  store.setState({ selectedGameAppIds: [20] });
  await store.getState().filterUserGames(['RPG']);
  assert.equal(store.getState().gamesError, '게임 목록 오류');
  assert.equal(store.getState().isLoadingGames, false);
  const pendingRetry = store.getState().filterUserGames(['RPG']);
  assert.equal(store.getState().gamesError, '게임 목록 오류');
  assert.equal(store.getState().isLoadingGames, true);
  assert.deepEqual(plain(store.getState().selectedGameAppIds), [20]);
  retry.resolve(filtered([game(20)]));
  await pendingRetry;
  assert.equal(store.getState().gamesError, null);
  assert.deepEqual(plain(store.getState().userGames).map((item) => item.appId), [20]);
  assert.equal(store.getState().userGames[0].selected, true);
});

test('a late initial cursor response cannot overwrite a newer filter', async () => {
  const initial = deferred();
  const store = loadStore({
    getUserGamesCursorApi: () => initial.promise,
    filterUserGamesApi: async () => filtered([game(20)]),
  });
  const fetchRequest = store.getState().fetchUserGames();
  await store.getState().filterUserGames(['RPG']);
  const acceptedFilter = librarySnapshot(store);
  initial.resolve(page([game(10)], { nextCursor: 10, hasNext: true, totalElements: 50 }));
  await fetchRequest;
  assert.deepEqual(librarySnapshot(store), acceptedFilter);
});

test('a fallback already in flight cannot overwrite a newer filter', async () => {
  const cursor = deferred();
  const fallback = deferred();
  let fallbackCalls = 0;
  const store = loadStore({
    getUserGamesCursorApi: () => cursor.promise,
    getUserGamesApi: () => { fallbackCalls++; return fallback.promise; },
    filterUserGamesApi: async () => filtered([game(20)]),
  });
  const fetchRequest = store.getState().fetchUserGames();
  cursor.reject(apiError('커서 조회 오류'));
  await flush();
  assert.equal(fallbackCalls, 1);
  await store.getState().filterUserGames(['RPG']);
  const acceptedFilter = librarySnapshot(store);
  fallback.resolve([game(10)]);
  await fetchRequest;
  assert.deepEqual(librarySnapshot(store), acceptedFilter);
});

test('an obsolete failed initial fetch does not start a legacy fallback', async () => {
  const cursor = deferred();
  let fallbackCalls = 0;
  const store = loadStore({
    getUserGamesCursorApi: () => cursor.promise,
    getUserGamesApi: async () => { fallbackCalls++; return [game(10)]; },
    filterUserGamesApi: async () => filtered([game(20)]),
  });
  const fetchRequest = store.getState().fetchUserGames();
  await store.getState().filterUserGames(['RPG']);
  const acceptedFilter = librarySnapshot(store);
  cursor.reject(apiError('오래된 커서 오류'));
  await fetchRequest;
  assert.equal(fallbackCalls, 0);
  assert.deepEqual(librarySnapshot(store), acceptedFilter);
});

for (const outcome of ['success', 'failure']) {
  test(`a stale additional page ${outcome} cannot affect a newer filter`, async () => {
    const more = deferred();
    const store = loadStore({
      getUserGamesCursorApi: () => more.promise,
      filterUserGamesApi: async () => filtered([game(20)]),
    });
    store.setState({ userGames: [game(10)], gamesCursor: 10, hasMoreGames: true, totalGamesCount: 50 });
    const pageRequest = store.getState().loadMoreGames();
    assert.equal(store.getState().isLoadingMoreGames, true);
    await store.getState().filterUserGames(['RPG']);
    const acceptedFilter = librarySnapshot(store);
    assert.equal(store.getState().isLoadingMoreGames, false);
    if (outcome === 'success') more.resolve(page([game(11)], { nextCursor: 11, hasNext: true, totalElements: 50 }));
    else more.reject(apiError('오래된 추가 페이지 오류'));
    await pageRequest;
    assert.deepEqual(librarySnapshot(store), acceptedFilter);
  });
}

for (const outcome of ['success', 'failure']) {
  test(`closing game A then opening B ignores the late A detail ${outcome}`, async () => {
    const a = deferred();
    const b = deferred();
    const store = loadStore({ getGameAchievementsApi: (appId) => appId === 10 ? a.promise : b.promise });
    store.setState({ userGames: [game(10), game(20)] });
    const requestA = store.getState().openGameDetailModal(game(10));
    store.getState().closeGameDetailModal();
    const requestB = store.getState().openGameDetailModal(game(20));
    b.resolve(achievements(20, 7));
    await requestB;
    const acceptedB = detailSnapshot(store);
    const acceptedLibrary = plain(store.getState().userGames);
    if (outcome === 'success') a.resolve(achievements(10, 2));
    else a.reject(apiError('오래된 상세 오류'));
    await requestA;
    assert.deepEqual(detailSnapshot(store), acceptedB);
    assert.deepEqual(plain(store.getState().userGames), acceptedLibrary);
    assert.equal(store.getState().achievementDetail.appId, 20);
  });

  test(`closing a detail modal invalidates its pending ${outcome}`, async () => {
    const request = deferred();
    const store = loadStore({ getGameAchievementsApi: () => request.promise });
    const opening = store.getState().openGameDetailModal(game(10));
    store.getState().closeGameDetailModal();
    const closed = detailSnapshot(store);
    assert.equal(closed.isLoadingGameDetail, false);
    assert.equal(closed.isSyncingAchievements, false);
    if (outcome === 'success') request.resolve(achievements(10));
    else request.reject(apiError('닫힌 상세 오류'));
    await opening;
    assert.deepEqual(detailSnapshot(store), closed);
  });
}

test('a current detail error is visible and closing it clears the error', async () => {
  const store = loadStore({ getGameAchievementsApi: async () => { throw apiError('현재 상세 오류'); } });
  await store.getState().openGameDetailModal(game(10));
  assert.equal(store.getState().gameDetailError, '현재 상세 오류');
  assert.equal(store.getState().isLoadingGameDetail, false);
  store.getState().closeGameDetailModal();
  assert.equal(store.getState().gameDetailError, null);
  assert.equal(store.getState().selectedGameDetail, null);
});

for (const outcome of ['success', 'failure']) {
  test(`opening B during A achievement sync ignores the late sync ${outcome}`, async () => {
    const sync = deferred();
    const store = loadStore({
      getGameAchievementsApi: async (appId) => achievements(appId, appId === 10 ? 3 : 7),
      syncGameAchievementsApi: () => sync.promise,
    });
    store.setState({ userGames: [game(10), game(20)] });
    await store.getState().openGameDetailModal(game(10));
    const syncingA = store.getState().syncGameAchievements();
    assert.equal(store.getState().isSyncingAchievements, true);
    await store.getState().openGameDetailModal(game(20));
    const acceptedB = detailSnapshot(store);
    assert.equal(acceptedB.isSyncingAchievements, false);
    if (outcome === 'success') sync.resolve(achievements(10, 10));
    else sync.reject(apiError('오래된 동기화 오류'));
    await syncingA;
    assert.deepEqual(detailSnapshot(store), acceptedB);
    assert.equal(store.getState().selectedGameDetail.appId, 20);
    assert.equal(store.getState().achievementDetail.appId, 20);
  });
}

test('a settings-started sync refreshes the latest add-modal filter and preserves selection', async () => {
  const syncing = deferred();
  const filterCalls = [];
  let cursorCalls = 0;
  const store = loadStore({
    syncSteamGamesApi: () => syncing.promise,
    filterUserGamesApi: async (genres, sort) => {
      filterCalls.push({ genres, sort });
      return filtered(filterCalls.length < 3 ? [game(10)] : [game(10), game(20)]);
    },
    getUserGamesCursorApi: async () => {
      cursorCalls++;
      return page([game(10), game(20)]);
    },
  });

  // The sync starts in settings, before the add modal and its filter exist.
  const pendingSync = store.getState().syncGames();
  store.getState().setAddGameModalOpen(true);
  await store.getState().filterUserGames(['RPG'], 'name-desc');
  store.getState().toggleGameSelection(10);
  await store.getState().filterUserGames(['액션'], 'recent');

  syncing.resolve({ syncedGameCount: 2, newlyAddedCount: 1, lastSyncedAt: '2026-10-02T10:00:00' });
  await pendingSync;

  assert.deepEqual(plain(filterCalls), [
    { genres: ['RPG'], sort: 'name-desc' },
    { genres: ['액션'], sort: 'recent' },
    { genres: ['액션'], sort: 'recent' },
  ]);
  assert.equal(cursorCalls, 0);
  assert.deepEqual(plain(store.getState().userGames).map((item) => item.appId), [10, 20]);
  assert.deepEqual(plain(store.getState().selectedGameAppIds), [10]);
  assert.equal(store.getState().userGames.find((item) => item.appId === 10).selected, true);
  assert.equal(store.getState().userGames.find((item) => item.appId === 20).selected, false);
  assert.equal(store.getState().isSyncingGames, false);
});

for (const outcome of ['success', 'failure']) {
  test(`closing and reopening the add modal invalidates a late sync refresh ${outcome}`, async () => {
    const syncing = deferred();
    const refreshing = deferred();
    let filterCalls = 0;
    const store = loadStore({
      syncSteamGamesApi: () => syncing.promise,
      filterUserGamesApi: () => {
        filterCalls++;
        if (filterCalls === 1) return Promise.resolve(filtered([game(10)]));
        if (filterCalls === 2) return refreshing.promise;
        return Promise.resolve(filtered([game(20)]));
      },
    });
    store.getState().setAddGameModalOpen(true);
    await store.getState().filterUserGames(['RPG'], 'playtime');
    const pendingSync = store.getState().syncGames();
    syncing.resolve({ syncedGameCount: 2, newlyAddedCount: 1, lastSyncedAt: '2026-10-02T10:00:00' });
    await flush();
    assert.equal(filterCalls, 2);

    store.getState().setAddGameModalOpen(false);
    store.getState().setAddGameModalOpen(true);
    await store.getState().filterUserGames(['액션'], 'recent');
    const acceptedNewQuery = librarySnapshot(store);
    if (outcome === 'success') refreshing.resolve(filtered([game(10)]));
    else refreshing.reject(apiError('닫힌 모달의 동기화 갱신 오류'));
    await pendingSync;

    assert.equal(filterCalls, 3);
    assert.deepEqual(librarySnapshot(store), acceptedNewQuery);
    assert.equal(store.getState().isSyncingGames, false);
  });
}
