import * as React from 'react';
import { createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const DEFAULT_JSON = '{"account":{"name":"test"}}';

const testState = vi.hoisted(() => ({
  account: { id: 'test-id', name: 'Account 1', author: { address: '0x123', shortAddress: '0x1...3' } },
  alertMock: vi.fn(),
  buildEditableAccountJsonMock: vi.fn<(account: unknown) => string>(() => DEFAULT_JSON),
  buildSavePayloadMock: vi.fn<(parsed: { account: Record<string, unknown> }, id: string) => Record<string, unknown>>((parsed, id) => ({
    ...parsed.account,
    id,
  })),
  locationState: null as { state?: { returnTo?: string } } | null,
  navigateMock: vi.fn(),
  safeParseAccountJsonMock: vi.fn<(text: string) => { account: Record<string, unknown> } | null>((text: string) => {
    try {
      const parsed = JSON.parse(text);
      return parsed?.account ? parsed : null;
    } catch {
      return null;
    }
  }),
  setAccountMock: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useLocation: () => testState.locationState ?? { state: null },
    useNavigate: () => testState.navigateMock,
  };
});

vi.mock('../../../lib/utils/account-editor-utils', () => ({
  buildEditableAccountJson: (account: unknown) => testState.buildEditableAccountJsonMock(account),
  buildSavePayload: (parsed: { account: Record<string, unknown> }, id: string) => testState.buildSavePayloadMock(parsed, id),
  safeParseAccountJson: (text: string) => testState.safeParseAccountJsonMock(text),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  setAccount: (payload: Record<string, unknown>) => testState.setAccountMock(payload),
  useAccount: () => testState.account,
}));

vi.mock('react-ace', async () => {
  const ReactModule = await vi.importActual<typeof import('react')>('react');
  await Promise.resolve();
  (
    globalThis as typeof globalThis & {
      ace?: { config?: { setModuleUrl?: ReturnType<typeof vi.fn> } };
    }
  ).ace = {
    config: {
      setModuleUrl: vi.fn(),
    },
  };

  return {
    default: ({ value, onChange }: { value: string; onChange: (nextValue: string) => void }) =>
      ReactModule.createElement('textarea', {
        'data-testid': 'ace-editor',
        onChange: (event: Event) => onChange((event.target as HTMLTextAreaElement).value),
        value,
      }),
  };
});

vi.mock('ace-builds/src-noconflict/mode-json', () => {
  if (!(globalThis as typeof globalThis & { ace?: unknown }).ace) {
    throw new Error('mode-json imported before ace');
  }

  return {};
});
vi.mock('ace-builds/src-noconflict/theme-monokai', () => {
  if (!(globalThis as typeof globalThis & { ace?: unknown }).ace) {
    throw new Error('theme-monokai imported before ace');
  }

  return {};
});
vi.mock('ace-builds/esm-resolver', () => {
  if (!(globalThis as typeof globalThis & { ace?: unknown }).ace) {
    throw new Error('ace is not defined');
  }

  return {};
});
vi.mock('ace-builds/src-noconflict/worker-json?url', () => ({ default: '/worker-json.js' }));

let root: Root;
let container: HTMLDivElement;
let AccountDataEditor: React.ComponentType;

const queryEditor = () => container.querySelector<HTMLTextAreaElement>('[data-testid="ace-editor"]') ?? container.querySelector<HTMLTextAreaElement>('textarea');

const flushEffects = async (count = 10) => {
  for (let i = 0; i < count; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const waitForEditor = async () => {
  for (let i = 0; i < 200; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
    await flushEffects(2);
    if (queryEditor()) {
      return;
    }
  }

  expect(queryEditor()).toBeTruthy();
};

const clickButton = async (label: string) => {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === label);
  expect(button).toBeTruthy();

  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const changeEditorValue = async (value: string) => {
  const editor = queryEditor();
  expect(editor).toBeTruthy();

  await act(async () => {
    if (editor) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      descriptor?.set?.call(editor, value);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
};

const renderEditor = () => {
  act(() => {
    root.render(createElement(AccountDataEditor));
  });
};

describe('AccountDataEditor', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    delete (globalThis as typeof globalThis & { ace?: unknown }).ace;
    AccountDataEditor = (await import('../account-data-editor')).default;
    testState.account = { id: 'test-id', name: 'Account 1', author: { address: '0x123', shortAddress: '0x1...3' } };
    testState.alertMock.mockReset();
    testState.buildEditableAccountJsonMock.mockReturnValue(DEFAULT_JSON);
    testState.buildSavePayloadMock.mockImplementation((parsed: { account: Record<string, unknown> }, id: string) => ({ ...parsed.account, id }));
    testState.locationState = null;
    testState.navigateMock.mockReset();
    testState.safeParseAccountJsonMock.mockImplementation((text: string) => {
      try {
        const parsed = JSON.parse(text);
        return parsed?.account ? parsed : null;
      } catch {
        return null;
      }
    });
    testState.setAccountMock.mockReset();
    vi.stubGlobal('alert', testState.alertMock);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('navigates back to the default settings route from the warning gate', async () => {
    renderEditor();
    expect(container.textContent).toContain('private_key_warning_title');

    await clickButton('go_back');

    expect(testState.navigateMock).toHaveBeenCalledWith('/subs/settings?section=account-settings');
  });

  it('loads the editor after continue and respects custom return routes', async () => {
    testState.locationState = { state: { returnTo: '/custom/settings#account' } };

    renderEditor();
    await clickButton('continue');

    expect(container.textContent).toContain('loading_editor');
    await waitForEditor();

    expect(container.textContent).not.toContain('loading_editor');
    expect(container.textContent).not.toContain('editor_fallback_warning');
    expect(container.querySelector('[data-testid="ace-editor"]')).toBeTruthy();

    await clickButton('return_to_settings');

    expect(testState.navigateMock).toHaveBeenLastCalledWith('/custom/settings#account');
  });

  it('resets edited text back to the account JSON snapshot', async () => {
    renderEditor();
    await clickButton('continue');
    await waitForEditor();

    expect(queryEditor()?.value).toBe(DEFAULT_JSON);

    await changeEditorValue('{"account":{"name":"changed"}}');
    expect(queryEditor()?.value).toBe('{"account":{"name":"changed"}}');

    await clickButton('reset_changes');

    expect(queryEditor()?.value).toBe(DEFAULT_JSON);
  });

  it('alerts on invalid JSON without attempting to save', async () => {
    renderEditor();
    await clickButton('continue');
    await waitForEditor();
    await changeEditorValue('not valid json');
    await clickButton('save_changes');

    expect(testState.alertMock).toHaveBeenCalledWith('Invalid JSON');
    expect(testState.setAccountMock).not.toHaveBeenCalled();
  });

  it('saves valid JSON and navigates back to settings', async () => {
    testState.setAccountMock.mockResolvedValueOnce(undefined);

    renderEditor();
    await clickButton('continue');
    await waitForEditor();
    await changeEditorValue('{"account":{"name":"changed"}}');
    await clickButton('save_changes');
    await flushEffects();

    expect(testState.buildSavePayloadMock).toHaveBeenCalledWith({ account: { name: 'changed' } }, 'test-id');
    expect(testState.setAccountMock).toHaveBeenCalledWith({ id: 'test-id', name: 'changed' });
    expect(testState.navigateMock).toHaveBeenCalledWith('/subs/settings?section=account-settings');
  });

  it('surfaces save errors from setAccount', async () => {
    testState.setAccountMock.mockRejectedValueOnce(new Error('save failed'));

    renderEditor();
    await clickButton('continue');
    await waitForEditor();
    await changeEditorValue('{"account":{"name":"changed"}}');
    await clickButton('save_changes');
    await flushEffects();

    expect(testState.alertMock).toHaveBeenCalledWith('save failed');
  });
});
