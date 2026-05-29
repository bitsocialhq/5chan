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
          aria-label='Crypto address'
          placeholder='myaddress.bso'
          value={cryptoAddress}
          onChange={(e) => {
            setCheckedAddress(undefined);
            setTransientResolutionStatus(undefined);
            setCryptoAddress(e.target.value);
          }}
        />
        <button type='button' className={styles.saveButton} onClick={saveCryptoAddress}>
          {t('save')}
        </button>
        <button
          type='button'
          className={styles.infoButton}
          aria-label={showCryptoAddressInfo ? 'Hide crypto address help' : 'Show crypto address help'}
          onClick={() => setShowCryptoAddressInfo(!showCryptoAddressInfo)}
        >
          {showCryptoAddressInfo ? 'x' : '?'}
        </button>
        {showCryptoAddressInfo && (
          <div className={styles.cryptoAddressInfo}>
            A <code>.bso</code> address is just an ENS name you own, shown by 5chan with a <code>.bso</code> ending instead of <code>.eth</code>. To use one as your
            account name:
            <ol>
              <li>
                Register a name (e.g. <code>yourname.eth</code>) at{' '}
                <a href='https://app.ens.domains/' target='_blank' rel='noopener noreferrer'>
                  app.ens.domains
                </a>
                .
              </li>
              <li>
                Open that name on ENS and go to <strong>Records</strong> → <strong>Edit Records</strong>.
              </li>
              <li>
                Add a <strong>text record</strong> named <code>bitsocial</code> and paste this account&apos;s public key as its value:
                <br />
                <code>{account?.signer?.address}</code>
              </li>
              <li>
                Come back here, type your name ending in <code>.bso</code> (e.g. <code>yourname.bso</code>) in the field above, press <strong>Check</strong> to confirm it
                points to this account, then press <strong>Save</strong>.
              </li>
            </ol>
          </div>
        )}
        {savedCryptoAddress && <span className={styles.saved}>{t('saved')}</span>}
      </div>
      <div className={styles.checkCryptoAddress}>
        <button type='button' className={styles.button} onClick={checkCryptoAddress}>
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
