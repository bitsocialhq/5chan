import { useEffect, useRef } from 'react';
import { createAccount, setAccount, useAccount, useAccounts } from '@bitsocial/bitsocial-react-hooks';
import { getBrowserPureP2PAccountOptions, shouldUpgradeBrowserPureP2PAccount } from '../lib/p2p-runtime';

type AccountShape = Record<string, unknown> & {
  id?: string;
};

const ACCOUNT_RECOVERY_CHECK_MS = 1000;

export const useBrowserPureP2PAccountUpgrade = () => {
  const account = useAccount() as AccountShape | undefined;
  const { accounts = [] } = useAccounts();
  const recoveryStartedRef = useRef(false);
  const upgradeAccountIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (account?.id || accounts.length > 0 || recoveryStartedRef.current) return;

    const intervalId = window.setInterval(() => {
      if (window.BITSOCIAL_REACT_HOOKS_ACCOUNTS_STORE_INITIALIZING) return;

      recoveryStartedRef.current = true;
      window.clearInterval(intervalId);
      void createAccount()
        .then(() => {
          window.location.reload();
        })
        .catch((error) => {
          recoveryStartedRef.current = false;
          console.error('Failed to recover missing browser account', error);
        });
    }, ACCOUNT_RECOVERY_CHECK_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [account?.id, accounts.length]);

  useEffect(() => {
    if (!account?.id || !shouldUpgradeBrowserPureP2PAccount(account)) return;
    if (upgradeAccountIdRef.current === account.id) return;

    upgradeAccountIdRef.current = account.id;

    void setAccount({
      ...account,
      pkcOptions: getBrowserPureP2PAccountOptions(account),
    })
      .then(() => {
        window.location.reload();
      })
      .catch((error) => {
        upgradeAccountIdRef.current = undefined;
        console.error('Failed to upgrade browser account to pure P2P options', error);
      });
  }, [account]);
};
