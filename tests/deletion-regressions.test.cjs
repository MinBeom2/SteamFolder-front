const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');

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
const confirmationCode = compile('src/utils/folderDeletion.ts');
const noop = () => {};
const inertComponents = new Proxy({}, { get: () => noop });

// Keep React's rendered children inert and run the actual component's effects.
// All persistence actions are stubs: these tests cannot delete real user data.
function mountCanvas(options = {}) {
  const effects = [];
  const confirmations = [];
  const toasts = [];
  const listeners = new Map();
  let removeCalls = 0;

  const windowStub = {
    confirm: (message) => {
      confirmations.push(message);
      return options.confirm !== false;
    },
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
  const confirmationModule = { exports: {}, window: windowStub };
  vm.runInNewContext(confirmationCode, confirmationModule);

  const modules = {
    react: reactStub,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-router-dom': { useParams: () => ({}), useNavigate: () => noop },
    '@/store/useAuthStore': {
      useAuthStore: () => ({ user: { username: 'tester' }, isAuthenticated: options.auth !== false }),
    },
    '@/store/useShowcaseStore': { useShowcaseStore: () => fixture },
    '@/utils/folderDeletion': confirmationModule.exports,
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
  const canvas = mountCanvas({ confirm: false });
  canvas.press();
  assert.equal(canvas.removeCalls, 0);
  assert.equal(canvas.confirmations.length, 1);
  assert.match(canvas.confirmations[0], /즐겨찾기/);
  assert.match(canvas.confirmations[0], /하위 폴더 및 배치된 게임/);
  assert.match(canvas.confirmations[0], /되돌릴 수 없습니다/);
  canvas.unmount();
});

for (const key of ['Delete', 'Backspace']) {
  test(`accepting ${key} folder deletion calls the persistence action once`, () => {
    const canvas = mountCanvas();
    canvas.press(key);
    assert.equal(canvas.removeCalls, 1);
    assert.equal(canvas.confirmations.length, 1);
    canvas.unmount();
  });
}

test('mixed selection confirmation describes folders and separately selected games', () => {
  const canvas = mountCanvas({ keys: ['FOLDER_7', 'FOLDER_8', 'GAME_42'] });
  canvas.press();
  assert.equal(canvas.removeCalls, 1);
  assert.match(canvas.confirmations[0], /폴더 2개/);
  assert.match(canvas.confirmations[0], /게임 1개/);
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
  canvas.press();
  assert.equal(canvas.removeCalls, 1);
  assert.equal(canvas.confirmations.length, 1);
  resolvePending();
  await pending;
  canvas.unmount();
});

test('a rejected deletion reports the failure instead of leaving an unhandled rejection', async () => {
  const canvas = mountCanvas({ pending: Promise.reject(new Error('offline')) });
  canvas.press();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(canvas.toasts, ['선택한 항목을 삭제하지 못했습니다.']);
  canvas.unmount();
});
