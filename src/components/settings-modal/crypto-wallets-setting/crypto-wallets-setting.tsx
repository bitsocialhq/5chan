import { memo, useState } from 'react';
import { Account, setAccount, useAccount } from '@bitsocial/bitsocial-react-hooks';
import styles from './crypto-wallets-setting.module.css';
import { Trans, useTranslation } from 'react-i18next';
import capitalize from 'lodash/capitalize';

interface Wallet {
  chainTicker: string;
  address: string;
  timestamp: number;
  signature: string;
}

const getWalletMessageToSign = (authorAddress: string, timestamp: number): string => {
  const messageToSign = {
    domainSeparator: 'plebbit-author-wallet',
    authorAddress,
    timestamp,
  };
  return JSON.stringify(messageToSign);
};

const CryptoWalletsForm = ({ account }: { account: Account | undefined }) => {
  const { t } = useTranslation();

  if (!account) {
    throw Error('CryptoWalletsForm account prop must be defined');
  }
  const authorAddress = account?.author?.address;
  const defaultWalletObject: Wallet = { chainTicker: '', address: '', timestamp: 0, signature: '' };

  const walletsFromAccount = Object.keys(account?.author?.wallets || {}).map(
    (chainTicker): Wallet => ({
      chainTicker,
      address: account.author.wallets[chainTicker].address,
      timestamp: account.author.wallets[chainTicker].timestamp,
      signature: account.author.wallets[chainTicker].signature.signature,
    }),
  );

  const defaultWalletsArray: Wallet[] = walletsFromAccount.length ? walletsFromAccount : [];

  const [walletsArray, setWalletsArray] = useState<Wallet[]>(defaultWalletsArray);
  const [selectedWallet, setSelectedWallet] = useState(0);
  const setWalletsArrayProperty = (index: number, property: keyof Wallet, value: string | number) => {
    const newArray = [...walletsArray];
    newArray[index] = { ...newArray[index], [property]: value };
    setWalletsArray(newArray);
  };

  const [hasCopied, setHasCopied] = useState(false);

  const copyMessageToSign = (wallet: any, index: number) => {
    if (!wallet.chainTicker) {
      return alert('missing chain ticker');
    }
    if (!wallet.address) {
      return alert('missing address');
    }
    const timestamp = wallet.timestamp || Math.floor(Date.now() / 1000);
    const messageToSign = getWalletMessageToSign(authorAddress, timestamp);
    if (timestamp !== wallet.timestamp) {
      setWalletsArrayProperty(index, 'timestamp', timestamp);
    }
    navigator.clipboard.writeText(messageToSign);
    setHasCopied(true);
    setTimeout(() => {
      setHasCopied(false);
    }, 2000);
  };

  const save = () => {
    const wallets: { [key: string]: { address: string; timestamp: number; signature: { signature: string; type: string } } } = {};
    walletsArray.forEach((wallet) => {
      if (wallet.chainTicker && wallet.address && wallet.signature && wallet.timestamp) {
        wallets[wallet.chainTicker] = {
          address: wallet.address,
          timestamp: wallet.timestamp,
          signature: {
            signature: wallet.signature,
            type: 'eip191',
          },
        };
      }
    });
    setAccount({ ...account, author: { ...account.author, wallets } });
    alert(t('saved'));
  };

  const _removeWallet = (index: number) => {
    const wallet = walletsArray[index];
    if (window.confirm(t('delete_confirm', { value: wallet.address, interpolation: { escapeValue: false } }))) {
      const newArray = [...walletsArray.slice(0, index), ...walletsArray.slice(index + 1)];
      setWalletsArray(newArray);
      setSelectedWallet(0);
    } else {
      return;
    }
  };

  const walletsInputs =
    walletsArray.length > 0 ? (
      <div key={selectedWallet} className={styles.walletBox}>
        <div className={`${styles.walletField} ${styles.step1}`}>
          <span className={styles.walletFieldTitle}>{capitalize(t('chain_ticker'))}: </span>
          <input
            type='text'
            onChange={(e) => setWalletsArrayProperty(selectedWallet, 'chainTicker', e.target.value)}
            value={walletsArray[selectedWallet].chainTicker}
            placeholder='eth/sol/matic'
          />
        </div>
        <div className={`${styles.walletField} ${styles.step2}`}>
          <span className={styles.walletFieldTitle}>{capitalize(t('wallet_address'))}: </span>
          <input
            type='text'
            onChange={(e) => setWalletsArrayProperty(selectedWallet, 'address', e.target.value)}
            value={walletsArray[selectedWallet].address}
            placeholder='0x...'
          />
        </div>
        <div className={`${styles.walletField} ${styles.step3}`}>
          <span className={styles.walletFieldTitle}>
            <Trans
              i18nKey='copy_message_etherscan'
              components={{
                1: <button key='copy-message-button' onClick={() => copyMessageToSign(walletsArray[selectedWallet], selectedWallet)} />,
                // eslint-disable-next-line
                2: <a key='etherscan-link' href='https://etherscan.io/verifiedSignatures' target='_blank' rel='noopener noreferrer' />,
              }}
              values={{ copy: hasCopied ? t('copied') : t('copy') }}
            />
          </span>
        </div>
        <div className={styles.walletField}>
          <span className={`${styles.walletFieldTitle} ${styles.timestampfield}`}>{capitalize(t('timestamp'))}: </span>
          <input
            type='text'
            onChange={(e) => setWalletsArrayProperty(selectedWallet, 'timestamp', Number(e.target.value))}
            value={walletsArray[selectedWallet].timestamp || ''}
            placeholder='1234567890'
          />
        </div>
        <div className={`${styles.walletField} ${styles.step4}`}>
          <span className={styles.walletFieldTitle}>{capitalize(t('paste_signature'))}: </span>
          <input
            type='text'
            onChange={(e) => setWalletsArrayProperty(selectedWallet, 'signature', e.target.value)}
            value={walletsArray[selectedWallet].signature}
            placeholder='0x...'
          />
          <div className={styles.buttons}>
            <button className={styles.save} onClick={save}>
              {t('save_changes')}
            </button>
          </div>
        </div>
        <div className={styles.deleteWalletContainer}>
          <button className={styles.removeWallet} onClick={() => _removeWallet(selectedWallet)}>
            {t('delete_wallet')}
          </button>
        </div>
      </div>
    ) : null;

  return (
    <>
      <div className={styles.addWallet}>
        <select onChange={(e) => setSelectedWallet(Number(e.target.value))} value={selectedWallet}>
          {walletsArray.length === 0 && <option>{t('none')}</option>}
          {walletsArray.map((wallet, index) => (
            <option key={wallet.address || (wallet.chainTicker ? `${wallet.chainTicker}-${index}` : `wallet-${index}`)} value={index}>
              {t('wallet')} #{index + 1}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            const newIndex = walletsArray.length;
            setWalletsArray((currentWallets) => [...currentWallets, defaultWalletObject]);
            setSelectedWallet(newIndex);
          }}
        >
          {t('create')}
        </button>
      </div>
      {walletsInputs}
    </>
  );
};

const CryptoWalletsSetting = () => {
  const account = useAccount();
  return (
    account && (
      <div className={styles.setting}>
        <CryptoWalletsForm account={account} />
      </div>
    )
  );
};

export default memo(CryptoWalletsSetting);
