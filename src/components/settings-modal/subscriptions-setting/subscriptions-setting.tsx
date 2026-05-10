import { setAccount, useAccount, useSubscribe } from '@bitsocial/bitsocial-react-hooks';
import getShortAddress from '../../../lib/get-short-address';
import styles from './subscriptions-setting.module.css';
import { useTranslation } from 'react-i18next';
import { memo, useState } from 'react';

const SubscriptionButton = ({ address }: { address: string }) => {
  const { t } = useTranslation();
  const { subscribed, subscribe, unsubscribe } = useSubscribe({ communityAddress: address });
  const [recentlyUnsubscribed, setRecentlyUnsubscribed] = useState(false);

  const toggleSubscription = () => {
    if (recentlyUnsubscribed || !subscribed) {
      subscribe();
      setRecentlyUnsubscribed(false);
    } else {
      unsubscribe();
      setRecentlyUnsubscribed(true);
    }
  };

  return (
    <span className={styles.subscriptionButton}>
      [
      <span
        className={styles.button}
        role='button'
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleSubscription();
          }
        }}
        onClick={toggleSubscription}
      >
        {recentlyUnsubscribed || !subscribed ? t('subscribe') : t('unsubscribe')}
      </span>
      ]
    </span>
  );
};

const SubscriptionsSetting = () => {
  const { t } = useTranslation();
  const { subscriptions } = useAccount() || [];
  const account = useAccount();

  const unsubscribeAll = () => {
    if (window.confirm(t('unsubscribe_all_confirm'))) {
      setAccount({ ...account, subscriptions: [] });
    }
  };

  return (
    <div className={styles.setting}>
      {subscriptions?.length > 0 ? (
        <>
          {subscriptions?.length > 1 && (
            <div className={styles.unsubscribeAll}>
              [
              <span
                className={styles.button}
                role='button'
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    unsubscribeAll();
                  }
                }}
                onClick={unsubscribeAll}
              >
                {t('unsubscribe_all')}
              </span>
              ]
            </div>
          )}
          <ul className={styles.subscriptions}>
            {subscriptions?.map((address: string) => (
              <li key={address} className={styles.subscription}>
                {address && getShortAddress(address)} <SubscriptionButton address={address} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className={styles.notSubscribed}>{t('not_subscribed_to_any_board')}</div>
      )}
    </div>
  );
};

export default memo(SubscriptionsSetting);
