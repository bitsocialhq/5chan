import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, usePkcRpcSettings } from '@bitsocial/bitsocial-react-hooks';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './settings-modal.module.css';
import AccountSettings from './account-settings/account-settings';
import CryptoAddressSetting from './crypto-address-setting/crypto-address-setting';
import CryptoWalletsSetting from './crypto-wallets-setting/crypto-wallets-setting';
import InterfaceSettings from './interface-settings/interface-settings';
import MediaHostingSettings from './media-hosting-settings/media-hosting-settings';
import AdvancedSettings from './advanced-settings/advanced-settings';
import SubscriptionsSetting from './subscriptions-setting/subscriptions-setting';
import TrustedBoardLinksSetting from './trusted-board-links-setting/trusted-board-links-setting';
import P2PStatsSettings from './p2p-stats-settings/p2p-stats-settings';
import { P2P_STATS_SECTION_ID, shouldShowP2PSettingsSection } from '../../lib/p2p-runtime';
import { getReviewableSettingsUpgrades, getSettingsUpgradeKey, type SettingsUpgradeAccount } from '../../lib/settings-upgrades';
import useSettingsUpgradeReviewStore from '../../stores/use-settings-upgrade-review-store';

const allSectionIds = [
  'interface-settings',
  'media-hosting-settings',
  'account-settings',
  'subscriptions-settings',
  'board-link-permissions-settings',
  'advanced-settings',
];

const hashToSection = (hash: string, sectionIds = allSectionIds): string | null => {
  if (hash === 'crypto-address-settings' || hash === 'crypto-wallet-settings') return 'account-settings';
  if (sectionIds.includes(hash)) return hash;
  return null;
};

const SettingsModal = () => {
  const { t } = useTranslation();
  const account = useAccount();
  const pkcRpc = usePkcRpcSettings();
  const { hash: locationHash, pathname } = useLocation();
  const navigate = useNavigate();
  const hiddenReviewUpgradeKeys = useSettingsUpgradeReviewStore((state) => state.hiddenReviewUpgradeKeys);
  const reviewUpgradeKeys = useSettingsUpgradeReviewStore((state) => state.reviewUpgradeKeys);
  const hash = locationHash.slice(1);
  const sectionIds = useMemo(() => (shouldShowP2PSettingsSection(account) ? [...allSectionIds, P2P_STATS_SECTION_ID] : allSectionIds), [account]);
  const hashSection = hashToSection(hash, sectionIds);
  const settingsUpgradeKeys = useMemo(() => {
    if (!account || pkcRpc?.state === 'connected') return [];

    const settingsUpgradeAccount = account as SettingsUpgradeAccount;
    return getReviewableSettingsUpgrades(settingsUpgradeAccount).map((upgrade) => getSettingsUpgradeKey(settingsUpgradeAccount, upgrade));
  }, [account, pkcRpc?.state]);
  const visibleSettingsUpgradeKeys = settingsUpgradeKeys.filter((upgradeKey) => !hiddenReviewUpgradeKeys.includes(upgradeKey));
  const showSettingsUpgradeReview = visibleSettingsUpgradeKeys.length > 0;

  const closeModal = useCallback(() => {
    const newPath = pathname.replace(/\/settings$/, '');
    navigate(newPath);
  }, [pathname, navigate]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [closeModal]);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    return hashSection ? new Set([hashSection]) : new Set();
  });

  const visibleExpandedSections = useMemo(() => {
    if (!hashSection || expandedSections.has(hashSection)) return expandedSections;
    const nextSections = new Set(expandedSections);
    nextSections.add(hashSection);
    return nextSections;
  }, [expandedSections, hashSection]);

  const showInterfaceSettings = visibleExpandedSections.has('interface-settings');
  const showMediaHostingSettings = visibleExpandedSections.has('media-hosting-settings');
  const showAccountSettings = visibleExpandedSections.has('account-settings');
  const showSubscriptionsSettings = visibleExpandedSections.has('subscriptions-settings');
  const showBoardLinkPermissionsSettings = visibleExpandedSections.has('board-link-permissions-settings');
  const showAdvancedSettings = visibleExpandedSections.has('advanced-settings');
  const showP2PStatsSettings = visibleExpandedSections.has(P2P_STATS_SECTION_ID);

  const allExpanded = useMemo(() => sectionIds.every((id) => visibleExpandedSections.has(id)), [sectionIds, visibleExpandedSections]);

  const basePath = pathname;

  const handleCategoryClick = (categoryId: string) => {
    const isOpening = !visibleExpandedSections.has(categoryId);
    const next = new Set(visibleExpandedSections);
    if (isOpening) {
      next.add(categoryId);
    } else {
      next.delete(categoryId);
    }
    setExpandedSections(next);

    if (isOpening) {
      navigate(`${basePath}#${categoryId}`, { replace: true });
    } else if (next.size === 1) {
      const remaining = next.values().next().value;
      navigate(`${basePath}#${remaining}`, { replace: true });
    } else {
      navigate(basePath, { replace: true });
    }
  };

  const handleExpandAll = () => {
    if (allExpanded) {
      setExpandedSections(new Set());
      navigate(basePath, { replace: true });
    } else {
      setExpandedSections(new Set(sectionIds));
      navigate(basePath, { replace: true });
    }
  };

  const handleReviewSettingsUpgrades = () => {
    reviewUpgradeKeys(visibleSettingsUpgradeKeys);
  };

  const handleKeyDown = (handler: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };

  return (
    <>
      <button type='button' className={styles.overlay} aria-label={t('close')} tabIndex={0} onClick={closeModal} onKeyDown={handleKeyDown(closeModal)} />
      <dialog open className={styles.settingsModal} aria-modal='true' aria-labelledby='settings-modal-title'>
        <div className={styles.header}>
          <span id='settings-modal-title' className={styles.title}>
            {t('settings')}
          </span>
          <button
            type='button'
            className={styles.closeButton}
            tabIndex={0}
            title='close'
            aria-label={t('close')}
            onClick={closeModal}
            onKeyDown={handleKeyDown(closeModal)}
          />
        </div>
        <div className={styles.expandAllSettings}>
          [
          <button type='button' tabIndex={0} onClick={handleExpandAll} onKeyDown={handleKeyDown(handleExpandAll)}>
            {allExpanded ? t('collapse_all_settings') : t('expand_all_settings')}
          </button>
          ]
        </div>
        <div id='interface-settings' className={`${styles.setting} ${styles.category}`}>
          <button type='button' className={styles.categoryButton} onClick={() => handleCategoryClick('interface-settings')}>
            <span className={showInterfaceSettings ? styles.hideButton : styles.showButton} />
            {t('interface')}
          </button>
        </div>
        {showInterfaceSettings && <InterfaceSettings />}
        <div id='media-hosting-settings' className={`${styles.setting} ${styles.category}`}>
          <button type='button' className={styles.categoryButton} onClick={() => handleCategoryClick('media-hosting-settings')}>
            <span className={showMediaHostingSettings ? styles.hideButton : styles.showButton} />
            {t('media_hosting')}
          </button>
        </div>
        {showMediaHostingSettings && <MediaHostingSettings />}
        <div id='account-settings' className={`${styles.setting} ${styles.category}`}>
          <button type='button' className={styles.categoryButton} onClick={() => handleCategoryClick('account-settings')}>
            <span className={showAccountSettings ? styles.hideButton : styles.showButton} />
            {t('bitsocial_account')}
          </button>
        </div>
        {showAccountSettings && (
          <>
            <AccountSettings />
            <div className={styles.subSectionHeader}>{t('crypto_address')}</div>
            <CryptoAddressSetting />
            <div className={styles.subSectionHeader}>{t('crypto_wallets')}</div>
            <CryptoWalletsSetting />
          </>
        )}
        <div id='subscriptions-settings' className={`${styles.setting} ${styles.category}`}>
          <button type='button' className={styles.categoryButton} onClick={() => handleCategoryClick('subscriptions-settings')}>
            <span className={showSubscriptionsSettings ? styles.hideButton : styles.showButton} />
            {t('board_subscriptions')}
          </button>
        </div>
        {showSubscriptionsSettings && <SubscriptionsSetting />}
        <div id='board-link-permissions-settings' className={`${styles.setting} ${styles.category}`}>
          <button type='button' className={styles.categoryButton} onClick={() => handleCategoryClick('board-link-permissions-settings')}>
            <span className={showBoardLinkPermissionsSettings ? styles.hideButton : styles.showButton} />
            {t('board_link_permissions')}
          </button>
        </div>
        {showBoardLinkPermissionsSettings && <TrustedBoardLinksSetting />}
        <div id='advanced-settings' className={`${styles.setting} ${styles.category}`}>
          <button type='button' className={styles.categoryButton} onClick={() => handleCategoryClick('advanced-settings')}>
            <span className={showAdvancedSettings ? styles.hideButton : styles.showButton} />
            {t('advanced_settings')}
          </button>
        </div>
        {showAdvancedSettings && <AdvancedSettings />}
        {sectionIds.includes(P2P_STATS_SECTION_ID) && (
          <>
            <div id={P2P_STATS_SECTION_ID} className={`${styles.setting} ${styles.category}`}>
              <button type='button' className={styles.categoryButton} onClick={() => handleCategoryClick(P2P_STATS_SECTION_ID)}>
                <span className={showP2PStatsSettings ? styles.hideButton : styles.showButton} />
                {t('p2p_stats')}
              </button>
            </div>
            {showP2PStatsSettings && <P2PStatsSettings />}
          </>
        )}
        {showSettingsUpgradeReview && (
          <output className={styles.settingsUpgradeNotice} aria-live='polite' data-testid='settings-upgrade-review-banner'>
            <span>{t('settings_upgrade_review_notice')}</span>
            {' ['}
            <button type='button' tabIndex={0} onClick={handleReviewSettingsUpgrades} onKeyDown={handleKeyDown(handleReviewSettingsUpgrades)}>
              {t('settings_upgrade_review_button')}
            </button>
            {']'}
          </output>
        )}
      </dialog>
    </>
  );
};

export default SettingsModal;
