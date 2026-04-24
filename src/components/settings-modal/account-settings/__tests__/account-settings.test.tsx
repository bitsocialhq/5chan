import * as React from 'react';
import { createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AccountSettings from '../account-settings';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;
const IMPORTED_ACCOUNT_ADDRESSES_STORAGE_KEY = 'importedAccountAddresses';

const hookMocks = vi.hoisted(() => ({
  deleteAccount: vi.fn(),
  exportAccount: vi.fn(),
  importAccount: vi.fn(),
  setActiveAccount: vi.fn(),
  useAccount: vi.fn(),
  useAccounts: vi.fn(),
}));

const fileReaderState = vi.hoisted(() => ({
  result: '',
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccount: hookMocks.useAccount,
  useAccounts: hookMocks.useAccounts,
  deleteAccount: hookMocks.deleteAccount,
  exportAccount: hookMocks.exportAccount,
  importAccount: hookMocks.importAccount,
  setActiveAccount: hookMocks.setActiveAccount,
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'web' },
}));

class MockFileReader {
  onload: ((event: { target: { result: unknown } }) => void) | null = null;

  readAsText() {
    this.onload?.({ target: { result: fileReaderState.result } });
  }
}

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid='location'>{location.pathname + location.hash}</div>;
};

let root: Root;
let container: HTMLDivElement;
let alertSpy: ReturnType<typeof vi.spyOn>;
let confirmSpy: ReturnType<typeof vi.spyOn>;
let createElementSpy: ReturnType<typeof vi.spyOn>;
let anchorClickSpy: ReturnType<typeof vi.spyOn>;
let inputClickSpy: ReturnType<typeof vi.spyOn>;
let consoleLogSpy: ReturnType<typeof vi.spyOn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let createdInput: HTMLInputElement | null;
let createdAnchor: HTMLAnchorElement | null;
let createObjectUrlSpy: ReturnType<typeof vi.fn>;
let revokeObjectUrlSpy: ReturnType<typeof vi.fn>;

const flushMicrotasks = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const render = (initialEntry = '/subs/settings') => {
  act(() => {
    root.render(
      createElement(MemoryRouter, { initialEntries: [initialEntry] }, createElement(React.Fragment, {}, createElement(AccountSettings), createElement(LocationProbe))),
    );
  });
};

const getButtons = () => Array.from(container.querySelectorAll('button'));

const getButtonByText = (text: string) => {
  const button = getButtons().find((candidate) => (candidate.textContent ?? '').includes(text));
  if (!button) {
    throw new Error(`Button containing "${text}" not found`);
  }
  return button;
};

const getLocationText = () => container.querySelector('[data-testid="location"]')?.textContent ?? '';

describe('AccountSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    fileReaderState.result = '';
    createdInput = null;
    createdAnchor = null;

    hookMocks.useAccount.mockReturnValue({
      id: 'test-id',
      name: 'Account 1',
      author: { address: '0x123', shortAddress: '0x1...3' },
      subscriptions: ['business.eth'],
    });
    hookMocks.useAccounts.mockReturnValue({
      accounts: [{ id: 'test-id', name: 'Account 1', author: { shortAddress: '0x1...3' } }],
    });

    createObjectUrlSpy = vi.fn(() => 'blob:test-account');
    revokeObjectUrlSpy = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrlSpy,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrlSpy,
    });

    vi.stubGlobal('FileReader', MockFileReader);

    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    inputClickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);

    const originalCreateElement = document.createElement.bind(document);
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options);
      if (tagName === 'input') {
        createdInput = element as HTMLInputElement;
      }
      if (tagName === 'a') {
        createdAnchor = element as HTMLAnchorElement;
      }
      return element;
    }) as typeof document.createElement);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => root.unmount());
    }
    container?.remove();
    alertSpy?.mockRestore();
    confirmSpy?.mockRestore();
    consoleLogSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();
    anchorClickSpy?.mockRestore();
    inputClickSpy?.mockRestore();
    createElementSpy?.mockRestore();
    vi.unstubAllGlobals();
  });

  it('renders the expected account actions without inline editor controls', () => {
    render();
    expect(container.querySelector('textarea')).toBeNull();

    const buttonTexts = getButtons().map((button) => button.textContent ?? '');
    expect(buttonTexts.some((text) => text.includes('save_changes'))).toBe(false);
    expect(buttonTexts.some((text) => text.includes('reset_changes'))).toBe(false);
    expect(buttonTexts.some((text) => text.includes('edit'))).toBe(true);
    expect(buttonTexts.some((text) => text.includes('download_backup'))).toBe(true);
    expect(buttonTexts.some((text) => text.includes('import_account_backup'))).toBe(true);
    expect(buttonTexts.some((text) => text.includes('delete_account'))).toBe(true);
  });

  it('shows generated-account copy for app-created accounts', () => {
    render();

    const infoText = container.querySelector('select')?.parentElement?.querySelector('div')?.textContent ?? '';
    expect(infoText).toContain('account_auto_generated');
    expect(infoText).toContain('stored_locally');
  });

  it('shows only the stored-locally copy for imported accounts', () => {
    localStorage.setItem(IMPORTED_ACCOUNT_ADDRESSES_STORAGE_KEY, JSON.stringify(['0x123']));

    render();

    const infoText = container.querySelector('select')?.parentElement?.querySelector('div')?.textContent ?? '';
    expect(infoText).toContain('stored_locally');
    expect(infoText).not.toContain('account_auto_generated');
  });

  it('treats the legacy imported account storage key as imported state', () => {
    localStorage.setItem('importedAccountAddress', '0x123');

    render();

    const infoText = container.querySelector('select')?.parentElement?.querySelector('div')?.textContent ?? '';
    expect(infoText).toContain('stored_locally');
    expect(infoText).not.toContain('account_auto_generated');
  });

  it('deletes the account only after both confirmations succeed', async () => {
    confirmSpy.mockReturnValueOnce(true).mockReturnValueOnce(true);

    render();

    await act(async () => {
      getButtonByText('delete_account').click();
    });

    expect(hookMocks.deleteAccount).toHaveBeenCalledWith('Account 1');
    expect(confirmSpy).toHaveBeenCalledTimes(2);
  });

  it('does not delete the account when the first confirmation is rejected', async () => {
    confirmSpy.mockReturnValueOnce(false);

    render();

    await act(async () => {
      getButtonByText('delete_account').click();
    });

    expect(hookMocks.deleteAccount).not.toHaveBeenCalled();
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });

  it('exports a formatted account backup download', async () => {
    hookMocks.exportAccount.mockResolvedValue(JSON.stringify({ account: { name: 'Account 1' } }));

    render();

    await act(async () => {
      getButtonByText('download_backup').click();
      await Promise.resolve();
    });

    expect(hookMocks.exportAccount).toHaveBeenCalledOnce();
    expect(createObjectUrlSpy).toHaveBeenCalledOnce();
    expect(anchorClickSpy).toHaveBeenCalledOnce();
    expect(createdAnchor?.download).toBe('Account_1.json');
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:test-account');
  });

  it('alerts when export returns malformed JSON', async () => {
    hookMocks.exportAccount.mockResolvedValue('not-json');

    render();

    await act(async () => {
      getButtonByText('download_backup').click();
      await Promise.resolve();
    });

    expect(alertSpy).toHaveBeenCalledWith('Failed to parse account');
    expect(createObjectUrlSpy).not.toHaveBeenCalled();
  });

  it('alerts when exportAccount throws', async () => {
    hookMocks.exportAccount.mockRejectedValue(new Error('export failed'));

    render();

    await act(async () => {
      getButtonByText('download_backup').click();
      await Promise.resolve();
    });

    expect(alertSpy).toHaveBeenCalledWith('export failed');
    expect(createObjectUrlSpy).not.toHaveBeenCalled();
  });

  it('alerts when no import file is selected', async () => {
    render();

    await act(async () => {
      getButtonByText('import_account_backup').click();
    });

    expect(createdInput).not.toBeNull();
    expect(inputClickSpy).toHaveBeenCalledOnce();

    await act(async () => {
      createdInput?.onchange?.({ target: { files: [] } } as unknown as Event);
    });

    expect(alertSpy).toHaveBeenCalledWith('No file selected.');
    expect(hookMocks.importAccount).not.toHaveBeenCalled();
  });

  it('alerts when the imported file contains invalid JSON', async () => {
    fileReaderState.result = '{bad json';
    render();

    await act(async () => {
      getButtonByText('import_account_backup').click();
    });

    const file = new File(['{}'], 'account.json', { type: 'application/json' });
    await act(async () => {
      createdInput?.onchange?.({ target: { files: [file] } } as unknown as Event);
    });

    expect(alertSpy).toHaveBeenCalledWith('Invalid JSON in file.');
    expect(hookMocks.importAccount).not.toHaveBeenCalled();
  });

  it('imports an account backup, merges owned boards into subscriptions, and redirects back to account settings', async () => {
    fileReaderState.result = JSON.stringify({
      account: {
        name: 'Imported',
        author: { address: '0x999' },
        subscriptions: ['business.eth'],
        communities: {
          'business.eth': { title: '/biz/' },
          'music-posting.bso': { title: '/mu/' },
        },
      },
    });
    hookMocks.importAccount.mockResolvedValue(undefined);
    hookMocks.setActiveAccount.mockResolvedValue(undefined);

    render();

    await act(async () => {
      getButtonByText('import_account_backup').click();
    });

    const file = new File(['{}'], 'account.json', { type: 'application/json' });
    await act(async () => {
      createdInput?.onchange?.({ target: { files: [file] } } as unknown as Event);
      await Promise.resolve();
    });
    await flushMicrotasks();

    expect(hookMocks.importAccount).toHaveBeenCalledOnce();
    const importedPayload = JSON.parse(hookMocks.importAccount.mock.calls[0][0]);
    expect(importedPayload.account.subscriptions).toEqual(['business.eth', 'music-posting.bso']);
    expect(localStorage.getItem(IMPORTED_ACCOUNT_ADDRESSES_STORAGE_KEY)).toBe(JSON.stringify(['0x999']));
    expect(localStorage.getItem('importedAccountAddress')).toBe('0x999');
    expect(hookMocks.setActiveAccount).toHaveBeenCalledWith('Imported');
    expect(alertSpy).toHaveBeenCalledWith('Imported Imported');
    expect(getLocationText()).toBe('/subs/settings#account-settings');
  });

  it('surfaces import errors without navigating or reloading', async () => {
    fileReaderState.result = JSON.stringify({
      account: {
        name: 'Imported',
        author: { address: '0x999' },
      },
    });
    hookMocks.importAccount.mockRejectedValue(new Error('import failed'));

    render();

    await act(async () => {
      getButtonByText('import_account_backup').click();
    });

    const file = new File(['{}'], 'account.json', { type: 'application/json' });
    await act(async () => {
      createdInput?.onchange?.({ target: { files: [file] } } as unknown as Event);
      await Promise.resolve();
    });
    await flushMicrotasks();

    expect(alertSpy).toHaveBeenCalledWith('import failed');
    expect(getLocationText()).toBe('/subs/settings');
  });
});
