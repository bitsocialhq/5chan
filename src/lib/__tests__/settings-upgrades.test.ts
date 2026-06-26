import { describe, expect, it } from 'vitest';

import {
  applySelectedSettingsUpgrades,
  getReviewableSettingsUpgrades,
  getSelectedSettingsUpgradeOptionCount,
  getSettingsUpgradeKey,
  getSettingsUpgradeOptionSelectionKey,
  type ReviewableSettingsUpgrade,
  type SettingsUpgradeAccount,
} from '../settings-upgrades';

describe('settings-upgrades', () => {
  it('describes HTTP tracker upgrades through the generic settings upgrade shape', () => {
    const account: SettingsUpgradeAccount = {
      id: 'account-1',
      pkcOptions: {
        httpRoutersOptions: ['https://routing.lol', 'https://peers.pleb.bot', 'https://peers.plebpubsub.xyz', 'https://peers.forumindex.com'],
      },
    };

    expect(getReviewableSettingsUpgrades(account)).toEqual([
      expect.objectContaining({
        id: 'http-routers',
        labelKey: 'advanced_settings_upgrade_http_routers',
        options: [
          expect.objectContaining({ id: 'https://routerofbitsocial.xyz', label: 'https://routerofbitsocial.xyz' }),
          expect.objectContaining({ id: 'https://bsotracker.online', label: 'https://bsotracker.online' }),
        ],
      }),
    ]);
  });

  it('applies any selected setting upgrade that follows the shared contract', () => {
    const account: SettingsUpgradeAccount = { id: 'account-1', existing: true };
    const firstUpgrade: ReviewableSettingsUpgrade = {
      id: 'first-setting',
      labelKey: 'first_setting',
      options: [
        { id: 'alpha', label: 'Alpha', ariaLabelKey: 'alpha' },
        { id: 'beta', label: 'Beta', ariaLabelKey: 'beta' },
      ],
      applySelectedOptions: (nextAccount, selectedOptionIds) => ({
        ...nextAccount,
        firstSetting: selectedOptionIds,
      }),
    };
    const secondUpgrade: ReviewableSettingsUpgrade = {
      id: 'second-setting',
      labelKey: 'second_setting',
      options: [{ id: 'gamma', label: 'Gamma', ariaLabelKey: 'gamma' }],
      applySelectedOptions: (nextAccount, selectedOptionIds) => ({
        ...nextAccount,
        secondSetting: selectedOptionIds,
      }),
    };
    const selections = {
      [getSettingsUpgradeOptionSelectionKey(firstUpgrade, firstUpgrade.options[0])]: true,
      [getSettingsUpgradeOptionSelectionKey(firstUpgrade, firstUpgrade.options[1])]: false,
      [getSettingsUpgradeOptionSelectionKey(secondUpgrade, secondUpgrade.options[0])]: true,
    };

    expect(getSelectedSettingsUpgradeOptionCount([firstUpgrade, secondUpgrade], selections)).toBe(2);
    expect(applySelectedSettingsUpgrades(account, [firstUpgrade, secondUpgrade], selections)).toEqual({
      id: 'account-1',
      existing: true,
      firstSetting: ['alpha'],
      secondSetting: ['gamma'],
    });
  });

  it('keys dismissed upgrades by account, upgrade id, and option signature', () => {
    const account: SettingsUpgradeAccount = { id: 'account-1' };
    const upgrade: ReviewableSettingsUpgrade = {
      id: 'future-setting',
      labelKey: 'future_setting',
      options: [
        { id: 'one', label: 'One', ariaLabelKey: 'one' },
        { id: 'two', label: 'Two', ariaLabelKey: 'two' },
      ],
      applySelectedOptions: (nextAccount) => nextAccount,
    };

    expect(getSettingsUpgradeKey(account, upgrade)).toBe('account-1:future-setting:one|two');
  });
});
