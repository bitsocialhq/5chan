import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccount, setAccount, useResolvedAuthorAddress } from '@bitsocialnet/bitsocial-react-hooks';
import styles from './crypto-address-setting.module.css';

const withErrorHandling = async <T,>(fn: () => Promise<T>, onError: (e: unknown) => void): Promise<T | undefined> => {
  try {
    return await fn();
  } catch (e) {
    onError(e);
    return undefined;
  }
};

const CryptoAddressSetting = () => {
  const { t } = useTranslation();
  const account = useAccount();

  const [cryptoState, setCryptoState] = useState({
    cryptoAddress: account?.author?.shortAddress.includes('.') ? account.author.shortAddress : '',
    checkingCryptoAddress: false,
    showResolvingMessage: true,
    resolveString: t('crypto_address_verification'),
    resolveClass: '',
  });

  const [savedCryptoAddress, setSavedCryptoAddress] = useState(false);
  const [shouldResolve, setShouldResolve] = useState(false);

  const authorToResolve = shouldResolve ? { ...account?.author, address: cryptoState.cryptoAddress } : undefined;
  const { resolvedAddress, state, error, chainProvider } = useResolvedAuthorAddress({ author: authorToResolve, cache: false });

  const [inputValue, setInputValue] = useState(account?.author?.shortAddress.includes('.') ? account.author.shortAddress : '');

  const checkCryptoAddress = () => {
    setShouldResolve(true);
    const addressToCheck = inputValue || cryptoState.cryptoAddress;
    if (!addressToCheck || !addressToCheck.includes('.')) {
      alert(t('enter_crypto_address'));
      return;
    }

    let resolveString = '';
    let resolveClass = '';

    if (state === 'failed') {
      resolveString = error instanceof Error ? `failed to resolve crypto address, error: ${error.message}` : 'cannot resolve crypto address, unknown error';
      resolveClass = styles.red;
    } else if (state === 'resolving') {
      resolveString = `resolving from ${chainProvider?.urls}`;
      resolveClass = styles.yellow;
    } else if (resolvedAddress && resolvedAddress === account?.signer?.address) {
      resolveString = t('crypto_address_yours');
      resolveClass = styles.green;
    } else if (resolvedAddress && resolvedAddress !== account?.signer?.address) {
      resolveString = t('crypto_address_not_yours');
      resolveClass = styles.red;
    } else {
      resolveString = t('crypto_address_verification');
      resolveClass = '';
    }

    setCryptoState((prevState) => ({
      ...prevState,
      cryptoAddress: addressToCheck,
      showResolvingMessage: true,
      resolveString,
      resolveClass,
    }));
  };

  const saveCryptoAddress = async () => {
    if (!cryptoState.cryptoAddress || !cryptoState.cryptoAddress.includes('.')) {
      alert(t('enter_crypto_address'));
      return;
    } else if (cryptoState.cryptoAddress === account?.author?.address) {
      setSavedCryptoAddress(true);
      setTimeout(() => {
        setSavedCryptoAddress(false);
      }, 2000);
      return;
    } else if (resolvedAddress && resolvedAddress !== account?.signer?.address) {
      alert(t('crypto_address_not_yours'));
      return;
    } else if (cryptoState.cryptoAddress && !resolvedAddress) {
      alert(t('crypto_address_not_resolved'));
      return;
    } else if (resolvedAddress && resolvedAddress === account?.signer?.address) {
      const result = await withErrorHandling(
        () => setAccount({ ...account, author: { ...account?.author, address: cryptoState.cryptoAddress } }),
        (error) => {
          if (error instanceof Error) {
            alert(error.message);
            console.log(error);
          } else {
            console.error('An unknown error occurred:', error);
          }
        },
      );
      if (result !== undefined) {
        setShouldResolve(false);
        setSavedCryptoAddress(true);
        setTimeout(() => setSavedCryptoAddress(false), 2000);
        setCryptoState((prevState) => ({
          ...prevState,
          savedCryptoAddress: true,
          cryptoAddress: '',
          checkingCryptoAddress: false,
        }));
      }
      setSavedCryptoAddress(true);
      setCryptoState((prevState) => ({
        ...prevState,
        checkingCryptoAddress: false,
        showResolvingMessage: false,
        resolveString: t('crypto_address_verification'),
        resolveClass: '',
      }));
    }
  };

  const [showCryptoAddressInfo, setShowCryptoAddressInfo] = useState(false);

  return (
    <div className={styles.setting}>
      <div className={styles.cryptoAddressInput}>
        <input
          type='text'
          placeholder='myaddress.bso'
          value={cryptoState.cryptoAddress}
          onChange={(e) => {
            setInputValue(e.target.value);
            setCryptoState((prevState) => ({ ...prevState, cryptoAddress: e.target.value }));
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
        <span className={cryptoState.resolveClass}>{cryptoState.resolveString}</span>
      </div>
    </div>
  );
};

export default memo(CryptoAddressSetting);
