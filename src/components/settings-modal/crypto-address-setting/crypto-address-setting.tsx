import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccount, setAccount, useResolvedAuthorAddress } from '@bitsocial/bitsocial-react-hooks';
import styles from './crypto-address-setting.module.css';

const withErrorHandling = async <T,>(fn: () => Promise<T>, onError: (e: unknown) => void): Promise<T | undefined> => {
  try {
    return await fn();
  } catch (e) {
    onError(e);
    return undefined;
  }
};

const getInitialCryptoAddress = (address?: string) => (address?.includes('.') ? address : '');

const getDefaultResolutionStatus = (t: (key: string) => string) => ({
  resolveClass: '',
  resolveString: t('crypto_address_verification'),
});

const getResolutionStatus = ({
  checkedAddress,
  chainProviderUrls,
  error,
  resolvedAddress,
  signerAddress,
  state,
  t,
}: {
  chainProviderUrls?: string[];
  checkedAddress?: string;
  error?: unknown;
  resolvedAddress?: string | null;
  signerAddress?: string;
  state?: string;
  t: (key: string) => string;
}) => {
  if (!checkedAddress) {
    return getDefaultResolutionStatus(t);
  }

  if (state === 'failed') {
    return {
      resolveClass: styles.red,
      resolveString: error instanceof Error ? `failed to resolve crypto address, error: ${error.message}` : 'cannot resolve crypto address, unknown error',
    };
  }

  if (state === 'resolving' || state === 'ready' || state === 'initializing') {
    return {
      resolveClass: styles.yellow,
      resolveString: chainProviderUrls ? `resolving from ${chainProviderUrls.join(', ')}` : t('loading'),
    };
  }

  if (resolvedAddress && resolvedAddress === signerAddress) {
    return {
      resolveClass: styles.green,
      resolveString: t('crypto_address_yours'),
    };
  }

  if (resolvedAddress && resolvedAddress !== signerAddress) {
    return {
      resolveClass: styles.red,
      resolveString: t('crypto_address_not_yours'),
    };
  }

  if (resolvedAddress === null || state === 'succeeded') {
    return {
      resolveClass: styles.red,
      resolveString: t('crypto_address_not_resolved'),
    };
  }

  return getDefaultResolutionStatus(t);
};

const showSavedIndicator = (setSavedCryptoAddress: (value: boolean) => void) => {
  setSavedCryptoAddress(true);
  setTimeout(() => {
    setSavedCryptoAddress(false);
  }, 2000);
};

type ResolutionStatus = ReturnType<typeof getResolutionStatus>;

const showTransientResolutionStatus = (setTransientResolutionStatus: (value: ResolutionStatus | undefined) => void, status: ResolutionStatus) => {
  setTransientResolutionStatus(status);
  setTimeout(() => {
    setTransientResolutionStatus(undefined);
  }, 2000);
};

const CryptoAddressSettingContent = ({ account }: { account: ReturnType<typeof useAccount> }) => {
  const { t } = useTranslation();
  const [cryptoAddress, setCryptoAddress] = useState(() => getInitialCryptoAddress(account?.author?.address));
  const [checkedAddress, setCheckedAddress] = useState<string>();
  const [savedCryptoAddress, setSavedCryptoAddress] = useState(false);
  const [showCryptoAddressInfo, setShowCryptoAddressInfo] = useState(false);
  const [transientResolutionStatus, setTransientResolutionStatus] = useState<ResolutionStatus>();

  const signerAddress = account?.signer?.address;
  const authorToResolve = checkedAddress ? { ...account?.author, address: checkedAddress } : undefined;
  const { resolvedAddress, state, error, chainProvider } = useResolvedAuthorAddress({ author: authorToResolve, cache: false });
  const resolutionStatus = getResolutionStatus({
    chainProviderUrls: chainProvider?.urls,
    checkedAddress,
    error,
    resolvedAddress,
    signerAddress,
    state,
    t,
  });

  const checkCryptoAddress = () => {
    const addressToCheck = cryptoAddress.trim();
    if (!addressToCheck || !addressToCheck.includes('.')) {
      showTransientResolutionStatus(setTransientResolutionStatus, {
        resolveClass: styles.red,
        resolveString: t('enter_crypto_address'),
      });
      return;
    }

    setCryptoAddress(addressToCheck);
    setCheckedAddress(addressToCheck);
  };

  const saveCryptoAddress = async () => {
    const addressToSave = cryptoAddress.trim();

    if (!addressToSave || !addressToSave.includes('.')) {
      alert(t('enter_crypto_address'));
      return;
    }

    if (addressToSave === account?.author?.address) {
      showSavedIndicator(setSavedCryptoAddress);
      return;
    }

    if (checkedAddress !== addressToSave || !resolvedAddress) {
      alert(t('crypto_address_not_resolved'));
      return;
    }

    if (resolvedAddress !== signerAddress) {
      alert(t('crypto_address_not_yours'));
      return;
    }

    const result = await withErrorHandling(
      () => setAccount({ ...account, author: { ...account?.author, address: addressToSave } }),
      (publishError) => {
        if (publishError instanceof Error) {
          alert(publishError.message);
          console.log(publishError);
        } else {
          console.error('An unknown error occurred:', publishError);
        }
      },
    );

    if (result === undefined) {
      return;
    }

    setCheckedAddress(undefined);
    setCryptoAddress(addressToSave);
    showSavedIndicator(setSavedCryptoAddress);
  };

  return (
    <div className={styles.setting}>
      <div className={styles.cryptoAddressInput}>
        <input
          type='text'
          placeholder='myaddress.bso'
          value={cryptoAddress}
          onChange={(e) => {
            setCheckedAddress(undefined);
            setTransientResolutionStatus(undefined);
            setCryptoAddress(e.target.value);
          }}
        />
        <button className={styles.saveButton} onClick={saveCryptoAddress}>
          {t('save')}
        </button>
        <button className={styles.infoButton} onClick={() => setShowCryptoAddressInfo(!showCryptoAddressInfo)}>
          {showCryptoAddressInfo ? 'x' : '?'}
        </button>
        {showCryptoAddressInfo && (
          <div className={styles.cryptoAddressInfo}>
            steps to set a .bso account address:
            <br />
            <ol>
              <li>
                buy your desired .bso address as .eth on{' '}
                <a href='https://app.ens.domains/' target='_blank' rel='noopener noreferrer'>
                  app.ens.domains
                </a>{' '}
              </li>
              <li>once you own the .eth address, go to its page on ENS, click on "records", then "edit records"</li>
              <li>add a new text record with name "bitsocial" and value: {account?.signer?.address}</li>
              <li>enter your .bso address in the input field above, click "check" to verify it's yours, then click "save"</li>
            </ol>
          </div>
        )}
        {savedCryptoAddress && <span className={styles.saved}>{t('saved')}</span>}
      </div>
      <div className={styles.checkCryptoAddress}>
        <button className={styles.button} onClick={checkCryptoAddress}>
          {t('check')}
        </button>{' '}
        <span className={(transientResolutionStatus ?? resolutionStatus).resolveClass}>{(transientResolutionStatus ?? resolutionStatus).resolveString}</span>
      </div>
    </div>
  );
};

const CryptoAddressSetting = () => {
  const account = useAccount();
  const accountResetKey = account?.id ?? account?.name ?? account?.signer?.address ?? account?.author?.address ?? 'default-account';

  return <CryptoAddressSettingContent key={accountResetKey} account={account} />;
};

export default memo(CryptoAddressSetting);
