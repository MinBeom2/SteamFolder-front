const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const router = require('react-router-dom');

function component(name) {
  const stub = () => null;
  stub.displayName = name;
  return stub;
}

function loadComponent(relativePath, dependencies) {
  const filename = path.join(__dirname, '..', relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const context = {
    exports: {},
    require: (name) => {
      if (name in dependencies) return dependencies[name];
      if (['react/jsx-runtime', 'react-router-dom', 'lucide-react'].includes(name)) return require(name);
      throw new Error(`Unexpected routing test dependency: ${name}`);
    },
    console: { warn() {}, error() {} },
  };
  vm.runInNewContext(outputText, context, { filename });
  return context.exports;
}

function elementsOfType(tree, type) {
  const matches = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!React.isValidElement(node)) return;
    if (node.type === type) matches.push(node);
    visit(node.props.children);
  }
  visit(tree);
  return matches;
}

// Match navigation against the actual routes returned by App, rather than a
// copied route table that could drift from the application.
function applicationRoutes() {
  const dependencies = {
    react: { ...React, useEffect() {} },
    '@/store/useAuthStore': { useAuthStore: () => ({ isInitialized: true, initializeAuth() {} }) },
    '@/store/useThemeStore': { useThemeStore: () => ({ initializeTheme() {} }) },
    '@/components/common/LoadingSpinner': { LoadingSpinner: component('LoadingSpinner') },
    '@/components/common/QueryError': { QueryError: component('QueryError') },
    '@/components/common/Button': { Button: component('Button') },
  };
  for (const name of ['HomePage', 'GuestShowcasePage', 'ShowcaseRankingPage', 'MyPage', 'AuthCallbackPage']) {
    dependencies[`@/pages/${name}`] = { [name]: component(name) };
  }
  const { App } = loadComponent('src/App.tsx', dependencies);
  const routesElement = elementsOfType(App(), router.Routes)[0];
  assert.ok(routesElement, 'App must render the registered routes');
  return router.createRoutesFromElements(routesElement.props.children);
}

const routes = applicationRoutes();

function guestPageHarness(identifier, folderId) {
  const effects = [];
  const navigations = [];
  const apiCalls = [];
  const FolderCard = component('FolderCard');
  const folder = {
    id: 101, name: 'Shared folder', themeColor: '#2a475e',
    positionX: 0, positionY: 0, depth: 0, gameCount: 0,
    childFolderCount: 0, games: [], childFolders: [],
  };
  const showcase = {
    user: { id: 2, steamId: 'fixture-only', username: identifier, avatarUrl: '', themeColor: '#2a475e', isPublic: true },
    stats: { totalOwnedGames: 0, totalPlaytimeForever: 0, totalFolders: 1, totalGamesInFolders: 0 },
    rootFolders: [folder],
  };
  let stateIndex = 0;
  const dependencies = {
    react: {
      ...React,
      useMemo: (compute) => compute(),
      useEffect: (effect) => { effects.push(effect); },
      useState: (initial) => {
        const index = stateIndex++;
        // Seed the loaded page: its first state is the showcase and third is
        // the initial loading flag. All other hook initializers run unchanged.
        let value = index === 0 ? showcase : index === 2 ? false : initial;
        const setValue = (next) => { value = typeof next === 'function' ? next(value) : next; };
        return [value, setValue];
      },
    },
    'react-router-dom': {
      ...router,
      useParams: () => ({ identifier, folderId }),
      useNavigate: () => (destination, options) => { navigations.push({ destination, options }); },
    },
    '@/api/showcase': {
      getPublicShowcaseApi: async (target) => { apiCalls.push({ method: 'showcase', target }); return showcase; },
      toggleShowcaseLikeApi: async () => { throw new Error('Unexpected like request'); },
    },
    '@/api/folder': {
      getFolderDetailApi: async (id) => {
        apiCalls.push({ method: 'folder', id });
        throw { response: { status: 404 } };
      },
    },
    '@/store/useAuthStore': { useAuthStore: () => ({ user: null, isAuthenticated: false }) },
    '@/components/desktop/FolderCard': { FolderCard },
  };
  for (const [directory, name] of [
    ['desktop', 'GameCard'], ['desktop', 'Breadcrumb'],
    ['layout', 'GuestBanner'], ['layout', 'Navbar'],
    ['common', 'LoadingSpinner'], ['common', 'Button'], ['common', 'QueryError'],
    ['modals', 'GameDetailModal'], ['modals', 'LoginRequiredModal'], ['modals', 'GuestUserGamesModal'],
  ]) dependencies[`@/components/${directory}/${name}`] = { [name]: component(name) };
  const { GuestShowcasePage } = loadComponent('src/pages/GuestShowcasePage.tsx', dependencies);
  const tree = GuestShowcasePage();
  return { tree, effects, navigations, apiCalls, FolderCard };
}

for (const identifier of ['A/B', 'A#B', 'A?B', 'A%B']) {
  test(`opening a public folder preserves nickname ${identifier} as one route parameter`, () => {
    const harness = guestPageHarness(identifier);
    const cards = elementsOfType(harness.tree, harness.FolderCard);
    assert.ok(cards.length > 0, 'The loaded page must render its folder');
    // Execute the real page callback supplied to FolderCard.
    cards[0].props.onOpen();
    assert.equal(harness.navigations.length, 1);
    const { destination } = harness.navigations[0];
    const matches = router.matchRoutes(routes, destination);
    assert.ok(matches, 'The navigation destination must match an application route');
    const params = matches.at(-1).params;
    assert.equal(params.identifier, identifier);
    assert.equal(params.folderId, '101');
    assert.equal(new URL(destination, 'http://localhost').hash, '');
    assert.equal(new URL(destination, 'http://localhost').search, '');
  });

  test(`failed public folder lookup returns to nickname ${identifier} without corrupting the route`, async () => {
    const harness = guestPageHarness(identifier, '999');
    assert.equal(harness.effects.length, 1);
    // Run the actual data-loading effect; its folder API rejection executes
    // the page's real catch handler and replace navigation.
    harness.effects[0]();
    await new Promise(setImmediate);
    assert.deepEqual(harness.apiCalls, [
      { method: 'showcase', target: identifier }, { method: 'folder', id: 999 },
    ]);
    assert.equal(harness.navigations.length, 1);
    const { destination, options } = harness.navigations[0];
    assert.equal(options.replace, true);
    const matches = router.matchRoutes(routes, destination);
    assert.ok(matches, 'The recovery destination must match an application route');
    const params = matches.at(-1).params;
    assert.equal(params.identifier, identifier);
    assert.equal(params.folderId, undefined);
    assert.equal(new URL(destination, 'http://localhost').hash, '');
    assert.equal(new URL(destination, 'http://localhost').search, '');
  });
}
