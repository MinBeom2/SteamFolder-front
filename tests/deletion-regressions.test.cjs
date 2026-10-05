const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
const { create } = require('zustand');

const projectRoot = path.resolve(__dirname, '..');
const compile = (relativePath) => ts.transpileModule(
  fs.readFileSync(path.join(projectRoot, relativePath), 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }
).outputText;

const canvasCode = compile('src/components/desktop/DesktopCanvas.tsx');
const confirmationCode = compile('src/store/useFolderDeletionStore.ts');
const noop = () => {};
const inertComponents = new Proxy({}, { get: () => noop });

function loadConfirmation() {
  const auth = { exports: {} };
  vm.runInNewContext(compile('src/utils/authSession.ts'), auth);
  const module = {
    exports: {},
    require: (name) => {
      if (name === 'zustand') return { create };
      if (name === '@/utils/authSession') return auth.exports;
      if (name === '@/utils/error') return { getErrorMessage: (error, fallback) => error.message || fallback };
      throw new Error(`Unexpected confirmation dependency: ${name}`);
    },
  };
  vm.runInNewContext(confirmationCode, module);
  return { store: module.exports.useFolderDeletionStore, invalidate: auth.exports.invalidateAuthSession };
}

// Keep React's rendered children inert and run the actual component's effects.
// All persistence actions are stubs: these tests cannot delete real user data.
function mountCanvas(options = {}) {
  const effects = [];
  const confirmations = [];
  const toasts = [];
  const listeners = new Map();
  let removeCalls = 0;
  const { store: confirmationStore } = loadConfirmation();
  confirmationStore.subscribe((state, previous) => {
    if (state.request && state.request !== previous.request) confirmations.push(state.request);
  });

  const windowStub = {
    addEventListener: (type, callback) => listeners.set(type, callback),
    removeEventListener: (type, callback) => {
      if (listeners.get(type) === callback) listeners.delete(type);
    },
  };

  const fixture = {
    items: [
      { type: 'FOLDER', id: 7, name: '즐겨찾기', positionX: 0, positionY: 0 },
      { type: 'FOLDER', id: 8, name: '인디', positionX: 1, positionY: 0 },
    ],
    selectedItemKeys: options.keys || ['FOLDER_7'],
    searchQuery: '',
    currentFolderId: null,
    currentFolder: null,
    removeSelectedGamesFromFolder: () => {
      removeCalls++;
      return options.pending || Promise.resolve();
    },
    setToastMessage: (message) => toasts.push(message),
    loadFolderView: async () => {},
    copySelected: noop,
    cutSelected: noop,
    pasteClipboard: noop,
    clearSelection: noop,
    setEditFolderModalOpen: noop,
  };

  const reactStub = {
    useEffect: (callback) => effects.push(callback),
    useMemo: (callback) => callback(),
    useState: (initial) => [initial, noop],
    useRef: (initial) => ({ current: initial }),
  };

  const modules = {
    react: reactStub,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-router-dom': { useParams: () => ({}), useNavigate: () => noop },
    '@/store/useAuthStore': {
      useAuthStore: () => ({ user: { username: 'tester' }, isAuthenticated: options.auth !== false }),
    },
    '@/store/useShowcaseStore': { useShowcaseStore: () => fixture },
    '@/store/useFolderDeletionStore': { useFolderDeletionStore: confirmationStore },
    '@/utils/error': {
      getErrorMessage: (_error, fallback) => fallback,
    },
    './FolderCard': inertComponents,
    './GameCard': inertComponents,
    './Breadcrumb': inertComponents,
    './LandingHeroMarquee': inertComponents,
    '@/components/common/Button': inertComponents,
    '@/components/common/LoadingSpinner': inertComponents,
    'lucide-react': inertComponents,
  };
  const componentModule = {
    exports: {},
    require: (name) => {
      if (!Object.hasOwn(modules, name)) throw new Error(`Unexpected component dependency: ${name}`);
      return modules[name];
    },
    window: windowStub,
    document: { querySelector: () => options.modal ? {} : null },
    console,
  };

  vm.runInNewContext(canvasCode, componentModule);
  componentModule.exports.DesktopCanvas({ isReadOnly: Boolean(options.readOnly) });
  const cleanups = effects.map((effect) => effect());

  return {
    confirmations,
    confirm: () => confirmationStore.getState().confirmDeletion(),
    cancel: () => confirmationStore.getState().cancelDeletion(),
    get error() { return confirmationStore.getState().error; },
    toasts,
    get removeCalls() { return removeCalls; },
    get hasKeyboardListener() { return listeners.has('keydown'); },
    press(key = 'Delete', tagName = 'DIV', extra = {}) {
      let prevented = false;
      listeners.get('keydown')?.({
        key,
        target: { tagName, isContentEditable: Boolean(extra.editable) },
        preventDefault: () => { prevented = true; },
        ...extra,
      });
      return prevented;
    },
    unmount() {
      cleanups.forEach((cleanup) => cleanup?.());
    },
  };
}

test('canceling recursive folder deletion never calls the persistence action', () => {
  const canvas = mountCanvas();
  canvas.press();
  canvas.cancel();
  assert.equal(canvas.removeCalls, 0);
  assert.equal(canvas.confirmations.length, 1);
  assert.deepEqual([...canvas.confirmations[0].folderNames], ['즐겨찾기']);
  canvas.unmount();
});

for (const key of ['Delete', 'Backspace']) {
  test(`accepting ${key} folder deletion calls the persistence action once`, async () => {
    const canvas = mountCanvas();
    canvas.press(key);
    assert.equal(canvas.removeCalls, 0);
    await canvas.confirm();
    assert.equal(canvas.removeCalls, 1);
    assert.equal(canvas.confirmations.length, 1);
    canvas.unmount();
  });
}

test('mixed selection confirmation describes folders and separately selected games', async () => {
  const canvas = mountCanvas({ keys: ['FOLDER_7', 'FOLDER_8', 'GAME_42'] });
  canvas.press();
  await canvas.confirm();
  assert.equal(canvas.removeCalls, 1);
  assert.equal(canvas.confirmations[0].folderNames.length, 2);
  assert.equal(canvas.confirmations[0].selectedGameCount, 1);
  canvas.unmount();
});

test('game-only selection preserves removal without a recursive folder confirmation', () => {
  const canvas = mountCanvas({ keys: ['GAME_42'] });
  canvas.press();
  assert.equal(canvas.removeCalls, 1);
  assert.equal(canvas.confirmations.length, 0);
  canvas.unmount();
});

for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
  test(`${tagName} keeps Backspace for its native editing behavior`, () => {
    const canvas = mountCanvas();
    assert.equal(canvas.press('Backspace', tagName), false);
    assert.equal(canvas.removeCalls, 0);
    assert.equal(canvas.confirmations.length, 0);
    canvas.unmount();
  });
}

test('contenteditable keeps Backspace for text editing', () => {
  const canvas = mountCanvas();
  assert.equal(canvas.press('Backspace', 'DIV', { editable: true }), false);
  assert.equal(canvas.removeCalls, 0);
  assert.equal(canvas.confirmations.length, 0);
  canvas.unmount();
});

test('an open application modal blocks background deletion', () => {
  const canvas = mountCanvas({ modal: true });
  assert.equal(canvas.press(), false);
  assert.equal(canvas.removeCalls, 0);
  assert.equal(canvas.confirmations.length, 0);
  canvas.unmount();
});

test('logged-out users do not receive canvas keyboard mutations', () => {
  const canvas = mountCanvas({ auth: false });
  assert.equal(canvas.hasKeyboardListener, false);
  canvas.press();
  assert.equal(canvas.removeCalls, 0);
  canvas.unmount();
});

test('a read-only showcase does not receive canvas keyboard mutations', () => {
  const canvas = mountCanvas({ readOnly: true });
  assert.equal(canvas.hasKeyboardListener, false);
  canvas.press();
  assert.equal(canvas.removeCalls, 0);
  canvas.unmount();
});

test('an empty selection does not request deletion or show confirmation', () => {
  const canvas = mountCanvas({ keys: [] });
  canvas.press();
  assert.equal(canvas.removeCalls, 0);
  assert.equal(canvas.confirmations.length, 0);
  canvas.unmount();
});

test('held Delete key does not repeatedly start deletion', () => {
  const canvas = mountCanvas();
  canvas.press('Delete', 'DIV', { repeat: true });
  assert.equal(canvas.removeCalls, 0);
  assert.equal(canvas.confirmations.length, 0);
  canvas.unmount();
});

test('a pending deletion blocks a second confirmation and persistence call', async () => {
  let resolvePending;
  const pending = new Promise((resolve) => { resolvePending = resolve; });
  const canvas = mountCanvas({ pending });
  canvas.press();
  const confirming = canvas.confirm();
  canvas.press();
  await canvas.confirm();
  assert.equal(canvas.removeCalls, 1);
  assert.equal(canvas.confirmations.length, 1);
  resolvePending();
  await confirming;
  canvas.unmount();
});

test('a rejected deletion reports the failure instead of leaving an unhandled rejection', async () => {
  const canvas = mountCanvas({ pending: Promise.reject(new Error('offline')) });
  canvas.press();
  await canvas.confirm();
  assert.equal(canvas.error, 'offline');
  assert.deepEqual(canvas.toasts, []);
  canvas.unmount();
});

test('game-only deletion failures still report through the existing toast', async () => {
  const canvas = mountCanvas({ keys: ['GAME_42'], pending: Promise.reject(new Error('offline')) });
  canvas.press();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(canvas.toasts, ['선택한 항목을 삭제하지 못했습니다.']);
  canvas.unmount();
});

test('a pending confirmation cannot be canceled or replaced', async () => {
  const { store } = loadConfirmation();
  let resolve;
  const pending = new Promise((done) => { resolve = done; });
  store.getState().requestDeletion({ folderNames: ['A'], onDelete: () => pending });
  const deleting = store.getState().confirmDeletion();
  store.getState().cancelDeletion();
  store.getState().requestDeletion({ folderNames: ['B'], onDelete: async () => {} });
  assert.equal(store.getState().request.folderNames[0], 'A');
  assert.equal(store.getState().isDeleting, true);
  resolve();
  await deleting;
  assert.equal(store.getState().request, null);
});

test('failed deletion preserves the dialog and can be retried', async () => {
  const { store } = loadConfirmation();
  let calls = 0;
  store.getState().requestDeletion({ folderNames: ['A'], onDelete: async () => {
    if (++calls === 1) throw new Error('연결 실패');
  } });
  await store.getState().confirmDeletion();
  assert.equal(store.getState().error, '연결 실패');
  assert.equal(store.getState().isDeleting, false);
  assert.ok(store.getState().request);
  await store.getState().confirmDeletion();
  assert.equal(calls, 2);
  assert.equal(store.getState().request, null);
});

test('logout clears a confirmation before any deletion starts', async () => {
  const { store, invalidate } = loadConfirmation();
  let calls = 0;
  store.getState().requestDeletion({ folderNames: ['A'], onDelete: async () => { calls++; } });
  invalidate();
  await store.getState().confirmDeletion();
  assert.equal(calls, 0);
  assert.equal(store.getState().request, null);
});

test('an old deletion result cannot close a newer session confirmation', async () => {
  const { store, invalidate } = loadConfirmation();
  let reject;
  const pending = new Promise((_resolve, fail) => { reject = fail; });
  store.getState().requestDeletion({ folderNames: ['A'], onDelete: () => pending });
  const deleting = store.getState().confirmDeletion();
  invalidate();
  store.getState().requestDeletion({ folderNames: ['B'], onDelete: async () => {} });
  reject(new Error('old error'));
  await deleting;
  assert.equal(store.getState().request.folderNames[0], 'B');
  assert.equal(store.getState().error, null);
  assert.equal(store.getState().isDeleting, false);
});

test('an old successful deletion cannot close a newer folder editor', async () => {
  const { store, invalidate } = loadConfirmation();
  let resolve;
  let closes = 0;
  const pending = new Promise((done) => { resolve = done; });
  store.getState().requestDeletion({ folderNames: ['A'], onDelete: () => pending, onSuccess: () => { closes++; } });
  const deleting = store.getState().confirmDeletion();
  invalidate();
  store.getState().requestDeletion({ folderNames: ['B'], onDelete: async () => {} });
  resolve();
  await deleting;
  assert.equal(closes, 0);
  assert.equal(store.getState().request.folderNames[0], 'B');
});

test('the dialog explains recursive deletion and mixed selection with safe default action order', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { store } = loadConfirmation();
  store.getState().requestDeletion({ folderNames: ['즐겨찾기', '인디'], selectedGameCount: 2, onDelete: async () => {} });
  const modules = {
    react: React,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'lucide-react': inertComponents,
    '@/store/useFolderDeletionStore': { useFolderDeletionStore: () => store.getState() },
    '@/components/common/Modal': { Modal: ({ children }) => React.createElement('section', null, children) },
    '@/components/common/Button': { Button: ({ children }) => React.createElement('button', null, children) },
  };
  const module = { exports: {}, require: (name) => modules[name] };
  vm.runInNewContext(compile('src/components/modals/DeleteFolderModal.tsx'), module);
  const html = renderToStaticMarkup(React.createElement(module.exports.DeleteFolderModal));
  assert.match(html, /선택한 폴더 2개/);
  assert.match(html, /하위 폴더와 폴더에 배치된 게임/);
  assert.match(html, /선택한 게임 2개/);
  assert.match(html, /되돌릴 수 없습니다/);
  assert.ok(html.indexOf('>취소<') < html.indexOf('>폴더 삭제<'));
});
