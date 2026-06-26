import { useState } from 'react';
import { setAccount, useAccount, usePkcRpcSettings } from '@bitsocial/bitsocial-react-hooks';
import { useTranslation } from 'react-i18next';
import {
  applySelectedSettingsUpgrades,
  getReviewableSettingsUpgrades,
  getSelectedSettingsUpgradeOptionCount,
  getSettingsUpgradeKey,
  getSettingsUpgradeOptionSelectionKey,
  isSettingsUpgradeOptionSelected,
  type ReviewableSettingsUpgrade,
  type SettingsUpgradeAccount,
  type SettingsUpgradeSelections,
} from '../../lib/settings-upgrades';
import useSettingsUpgradeReviewStore from '../../stores/use-settings-upgrade-review-store';
import styles from './settings-upgrade-modal.module.css';

const SettingsUpgradeModalContent = ({
  account,
  allowPermanentHide,
  dismissUpgrades,
  hideUpgrades,
  upgradeKeys,
  upgrades,
}: {
  account: SettingsUpgradeAccount;
  allowPermanentHide: boolean;
  dismissUpgrades: (upgradeKeys: string[], persist: boolean) => void;
  hideUpgrades: (upgradeKeys: string[]) => void;
  upgradeKeys: string[];
  upgrades: ReviewableSettingsUpgrade[];
}) => {
  const { t } = useTranslation();
  const [upgradeSelections, setUpgradeSelections] = useState<SettingsUpgradeSelections>({});
  const selectedUpgradeOptionCount = getSelectedSettingsUpgradeOptionCount(upgrades, upgradeSelections);

  const handleSelectionChange = (upgrade: ReviewableSettingsUpgrade, optionId: string, selected: boolean) => {
    const option = upgrade.options.find((candidate) => candidate.id === optionId);
    if (!option) return;

    setUpgradeSelections((selections) => ({
      ...selections,
      [getSettingsUpgradeOptionSelectionKey(upgrade, option)]: selected,
    }));
  };

  const handleKeepCurrent = () => {
    dismissUpgrades(upgradeKeys, true);
  };

  const handleNeverShowAgain = () => {
    hideUpgrades(upgradeKeys);
  };

  const handleApplySelected = async () => {
    if (selectedUpgradeOptionCount === 0) {
      dismissUpgrades(upgradeKeys, true);
      return;
    }

    try {
      await setAccount(applySelectedSettingsUpgrades(account, upgrades, upgradeSelections));
      window.location.reload();
    } catch (error) {
      alert(t('settings_upgrade_error_saving'));
      if (error instanceof Error) {
        console.log(error);
      }
    }
  };

  return (
    <div className={styles.backdrop}>
      <button type='button' className={styles.backdropButton} aria-label={t('close')} onClick={() => dismissUpgrades(upgradeKeys, false)} />
      <dialog open className={styles.dialog} aria-modal='true' aria-labelledby='settings-upgrade-modal-title'>
        <div className={styles.header}>
          <h2 id='settings-upgrade-modal-title'>{t('advanced_settings_upgrade_available')}</h2>
          <button type='button' className={styles.closeButton} aria-label={t('close')} title={t('close')} onClick={() => dismissUpgrades(upgradeKeys, false)} />
        </div>
        <div className={styles.body}>
          <p className={styles.tip}>{t('advanced_settings_upgrade_tip')}</p>
          {upgrades.map((upgrade) => (
            <fieldset className={styles.options} key={upgrade.id}>
              <legend>{t(upgrade.labelKey)}</legend>
              {upgrade.options.map((option) => (
                <label className={styles.option} key={option.id}>
                  <input
                    type='checkbox'
                    aria-label={t(option.ariaLabelKey, option.ariaLabelValues)}
                    checked={isSettingsUpgradeOptionSelected(upgrade, option, upgradeSelections)}
                    onChange={(event) => handleSelectionChange(upgrade, option.id, event.currentTarget.checked)}
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
          ))}
          <div className={styles.actions}>
            <button type='button' onClick={handleKeepCurrent}>
              {t('settings_upgrade_keep_current')}
            </button>
            <button type='button' onClick={handleApplySelected} disabled={selectedUpgradeOptionCount === 0}>
              {t('settings_upgrade_apply_selected')}
            </button>
          </div>
          {allowPermanentHide && (
            <div className={styles.neverShowAgainAction}>
              <button type='button' onClick={handleNeverShowAgain}>
                {t('settings_upgrade_never_show_again')}
              </button>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
};

const SettingsUpgradeModal = () => {
  const account = useAccount() as SettingsUpgradeAccount | undefined;
  const pkcRpc = usePkcRpcSettings();
  const { dismissUpgradeKeys, hiddenReviewUpgradeKeys, hideReviewUpgradeKeys, persistentDismissedUpgradeKeys, reviewedUpgradeKeys, reviewRequestId } =
    useSettingsUpgradeReviewStore();
  const [sessionDismissedUpgradeKeys, setSessionDismissedUpgradeKeys] = useState<{ reviewRequestId: number; upgradeKeys: string[] }>(() => ({
    reviewRequestId,
    upgradeKeys: [],
  }));

  if (!account || pkcRpc?.state === 'connected') return null;

  const activeSessionDismissedUpgradeKeys = sessionDismissedUpgradeKeys.reviewRequestId === reviewRequestId ? sessionDismissedUpgradeKeys.upgradeKeys : [];
  const dismissedUpgradeKeys = new Set([...persistentDismissedUpgradeKeys, ...hiddenReviewUpgradeKeys, ...activeSessionDismissedUpgradeKeys]);
  const settingsUpgrades = getReviewableSettingsUpgrades(account).filter((upgrade) => !dismissedUpgradeKeys.has(getSettingsUpgradeKey(account, upgrade)));
  if (settingsUpgrades.length === 0) return null;

  const upgradeKeys = settingsUpgrades.map((upgrade) => getSettingsUpgradeKey(account, upgrade));
  const reviewedUpgradeKeySet = new Set(reviewedUpgradeKeys);
  const allowPermanentHide = upgradeKeys.some((upgradeKey) => reviewedUpgradeKeySet.has(upgradeKey));

  const dismissUpgrades = (nextUpgradeKeys: string[], persist: boolean) => {
    if (persist) {
      dismissUpgradeKeys(nextUpgradeKeys);
      return;
    }

    setSessionDismissedUpgradeKeys({
      reviewRequestId,
      upgradeKeys: [...new Set([...activeSessionDismissedUpgradeKeys, ...nextUpgradeKeys])],
    });
  };

  return (
    <SettingsUpgradeModalContent
      key={upgradeKeys.join('\n')}
      account={account}
      allowPermanentHide={allowPermanentHide}
      dismissUpgrades={dismissUpgrades}
      hideUpgrades={hideReviewUpgradeKeys}
      upgradeKeys={upgradeKeys}
      upgrades={settingsUpgrades}
    />
  );
};

export default SettingsUpgradeModal;
