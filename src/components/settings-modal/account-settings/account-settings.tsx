import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteAccount, exportAccount, importAccount, setActiveAccount, useAccount, useAccounts } from '@bitsocial/bitsocial-react-hooks';
import styles from './account-settings.module.css';
import { Capacitor } from '@capacitor/core';
import { useLocation, useNavigate } from 'react-router-dom';

const isAndroid = Capacitor.getPlatform() === 'android';
const IMPORTED_ACCOUNT_ADDRESSES_STORAGE_KEY = 'importedAccountAddresses';
const IMPORTED_ACCOUNT_ADDRESS_LEGACY_STORAGE_KEY = 'importedAccountAddress';

const safeParseJSON = <T,>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const withErrorHandling = async <T,>(fn: () => Promise<T>, onError: (e: unknown) => void): Promise<T | undefined> => {
  try {
    return await fn();
  } catch (e) {
    onError(e);
    return undefined;
  }
};

const readImportedAccountAddresses = (): string[] => {
  try {
    const storedAddresses = localStorage.getItem(IMPORTED_ACCOUNT_ADDRESSES_STORAGE_KEY);
    const parsedAddresses = storedAddresses ? safeParseJSON<unknown>(storedAddresses) : null;
    const normalizedAddresses = Array.isArray(parsedAddresses)
      ? parsedAddresses.filter((address): address is string => typeof address === 'string' && address.length > 0)
      : [];
    const legacyAddress = localStorage.getItem(IMPORTED_ACCOUNT_ADDRESS_LEGACY_STORAGE_KEY);
    return [...new Set(legacyAddress ? [...normalizedAddresses, legacyAddress] : normalizedAddresses)];
  } catch (error) {
    console.warn('Failed to read imported account addresses from localStorage:', error);
    return [];
  }
};

const rememberImportedAccountAddress = (address: string) => {
  try {
    const importedAddresses = readImportedAccountAddresses();
    const nextImportedAddresses = [...new Set([...importedAddresses, address])];
    localStorage.setItem(IMPORTED_ACCOUNT_ADDRESSES_STORAGE_KEY, JSON.stringify(nextImportedAddresses));
    localStorage.setItem(IMPORTED_ACCOUNT_ADDRESS_LEGACY_STORAGE_KEY, address);
  } catch (error) {
    console.warn('Failed to save imported account address to localStorage:', error);
  }
};

const getSafeAccountBackupFileName = (accountName: string | undefined): string => {
  const safeName = (accountName || 'account').replace(/[^\w.-]/g, '_') || 'account';
  return `${safeName}.json`;
};

// Inner component keyed by account id so state resets when user switches account
const AccountSettingsEditor = ({
  account,
}: {
  account?: { id?: string; name?: string; author?: { address?: string; shortAddress?: string }; [key: string]: unknown };
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { accounts } = useAccounts();
  const navigate = useNavigate();

  const _deleteAccount = (accountName: string) => {
    if (!accountName) {
      return;
    } else if (window.confirm(t('delete_confirm', { value: accountName, interpolation: { escapeValue: false } }))) {
      if (window.confirm(t('double_confirm'))) {
        deleteAccount(accountName);
      }
    } else {
      return;
    }
  };

  const handleExportAccount = async () => {
    const accountString = await withErrorHandling(
      () => exportAccount(),
      (error) => {
        if (error instanceof Error) {
          alert(error.message);
          console.log(error);
        } else {
          console.error('An unknown error occurred:', error);
        }
      },
    );
    if (accountString === undefined) return;
    const accountObject = safeParseJSON<Record<string, unknown>>(accountString);
    if (!accountObject) {
      alert('Failed to parse account');
      return;
    }
    const formattedAccountJson = JSON.stringify(accountObject, null, 2);
    const blob = new Blob([formattedAccountJson], { type: 'application/json' });
    const fileUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = getSafeAccountBackupFileName(account?.name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(fileUrl);
  };

  const handleImportAccount = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';

    fileInput.onchange = async (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files || files.length === 0) {
        alert('No file selected.');
        return;
      }
      const file = files[0];

      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileContent = e.target?.result ?? reader.result;
        if (typeof fileContent !== 'string') {
          alert('File content is not a string.');
          return;
        }

        const accountData = safeParseJSON<{
          account?: { communities?: Record<string, unknown>; subscriptions?: string[]; author?: { address?: string }; name?: string };
        }>(fileContent);
        if (!accountData) {
          alert('Invalid JSON in file.');
          return;
        }

        if (accountData.account?.communities) {
          const communityAddresses = Object.keys(accountData.account.communities);
          if (!accountData.account.subscriptions) {
            accountData.account.subscriptions = [];
          }
          const uniqueSubscriptions = [...accountData.account.subscriptions];
          for (const address of communityAddresses) {
            if (!uniqueSubscriptions.includes(address)) {
              uniqueSubscriptions.push(address);
            }
          }
          accountData.account.subscriptions = uniqueSubscriptions;
        }

        const modifiedAccountJson = JSON.stringify(accountData);
        const result = await withErrorHandling(
          async () => {
            await importAccount(modifiedAccountJson);
            if (accountData.account?.author?.address) {
              rememberImportedAccountAddress(accountData.account.author.address);
            }
            if (accountData.account?.name) {
              await setActiveAccount(accountData.account.name);
            }
            return true;
          },
          (error) => {
            if (error instanceof Error) {
              alert(error.message);
              console.log(error);
            } else {
              console.error('An unknown error occurred:', error);
            }
          },
        );
        if (result === undefined) return;

        alert(`Imported ${accountData.account?.name}`);
        const currentPath = location.pathname;
        if (!currentPath.includes('/settings#account-settings')) {
          navigate(`${currentPath}#account-settings`, { replace: true });
        }
        window.location.reload();
      };
      reader.readAsText(file);
    };

    fileInput.click();
  };

  const accountsOptions = accounts.map((account) => (
    <option key={account?.id} value={account?.name}>
      {account?.author?.shortAddress}
    </option>
  ));

  const host = window.electronApi?.isElectron ? 'this desktop app' : isAndroid ? 'this mobile app' : window.location.hostname;
  const isImportedAccount = typeof account?.author?.address === 'string' && readImportedAccountAddresses().includes(account.author.address);
  const accountStorageInfo = isImportedAccount
    ? t('stored_locally', { location: host, interpolation: { escapeValue: false } })
    : `${t('account_auto_generated')} ${t('stored_locally', { location: host, interpolation: { escapeValue: false } })}`;

  return (
    <div className={styles.setting}>
      <div>
        <select value={account?.name} onChange={(e) => setActiveAccount(e.target.value)}>
          {accountsOptions}
        </select>{' '}
        <button onClick={() => navigate('/settings/account-data', { state: { returnTo: location.pathname + location.hash } })}>{t('edit')}</button>{' '}
        <button onClick={handleExportAccount}>{t('download_backup')}</button>
        <div className={styles.info}>{accountStorageInfo}</div>
      </div>
      <div>
        <button onClick={handleImportAccount}>{t('import_account_backup')}</button>
        <button className={styles.deleteAccount} onClick={() => _deleteAccount(account?.name ?? '')}>
          {t('delete_account')}
        </button>
      </div>
    </div>
  );
};

const AccountSettings = () => {
  const account = useAccount();
  return <AccountSettingsEditor key={account?.id} account={account} />;
};

export default memo(AccountSettings);
