import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import packageJson from '../../../../package.json';
import styles from './interface-settings.module.css';
import capitalize from 'lodash/capitalize';
import useExpandedMediaStore from '../../../stores/use-expanded-media-store';
import useFeedViewSettingsStore from '../../../stores/use-feed-view-settings-store';
import Version from '../../version';
import StyleSelector from '../../style-selector/style-selector';
import { INTERFACE_LANGUAGE_STORAGE_KEY, SUPPORTED_INTERFACE_LANGUAGES } from '../../../lib/constants';
import { fetchLatestStableVersion, isElectron } from '../../../lib/app-update';
import useAppUpdateStore from '../../../stores/use-app-update-store';

const commitRef = process.env.VITE_COMMIT_REF;

const fetchLatestVersionInfo = async (t: (key: string, opts?: Record<string, unknown>) => string, applyAppUpdate: () => Promise<void>): Promise<void> => {
  try {
    const latestStableVersion = await fetchLatestStableVersion();
    let updateAvailable = false;

    if (packageJson.version !== latestStableVersion) {
      if (isElectron) {
        const newVersionText = t('new_stable_version', { newVersion: latestStableVersion, oldVersion: packageJson.version });
        const updateActionText = t('download_latest_desktop', { link: 'https://github.com/bitsocialnet/5chan/releases/latest', interpolation: { escapeValue: false } });
        alert(newVersionText + ' ' + updateActionText);
      } else {
        await applyAppUpdate();
        return;
      }

      updateAvailable = true;
    }

    if (commitRef && commitRef.length > 0) {
      const commitRes = await fetch('https://api.github.com/repos/bitsocialnet/5chan/commits?per_page=1&sha=development', { cache: 'no-cache' });
      const commitData = await commitRes.json();

      const latestCommitHash = commitData[0].sha;

      if (latestCommitHash.trim() !== commitRef.trim()) {
        const newVersionText = t('new_development_version', { newCommit: latestCommitHash.slice(0, 7), oldCommit: commitRef.slice(0, 7) }) + ' ' + t('refresh_to_update');
        alert(newVersionText);
        updateAvailable = true;
      }
    }

    if (!updateAvailable) {
      alert(
        commitRef
          ? `${t('latest_development_version', { commit: commitRef.slice(0, 7), link: `${window.location.origin}/#/`, interpolation: { escapeValue: false } })}`
          : `${t('latest_stable_version', { version: packageJson.version })}`,
      );
    }
  } catch (error) {
    alert('Failed to fetch latest version info: ' + error);
  }
};

const CheckForUpdates = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const needRefresh = useAppUpdateStore((state) => state.needRefresh);
  const applyAppUpdate = useAppUpdateStore((state) => state.applyAppUpdate);

  const checkForUpdates = async () => {
    setLoading(true);
    try {
      if (needRefresh) {
        await applyAppUpdate();
        return;
      }

      await fetchLatestVersionInfo(t, applyAppUpdate);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button className={styles.checkForUpdatesButton} onClick={checkForUpdates} disabled={loading}>
      {needRefresh ? t('update') : t('check')}
    </button>
  );
};

const InterfaceLanguage = () => {
  const { i18n } = useTranslation();
  const { changeLanguage, language } = i18n;

  const onSelectLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLanguage = e.target.value;
    localStorage.setItem(INTERFACE_LANGUAGE_STORAGE_KEY, selectedLanguage);
    changeLanguage(selectedLanguage);
  };

  return (
    <div className={styles.languageSettings}>
      <select value={language} onChange={onSelectLanguage}>
        {SUPPORTED_INTERFACE_LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>
    </div>
  );
};

const InterfaceSettings = () => {
  const { t } = useTranslation();
  const { fitExpandedImagesToScreen, setFitExpandedImagesToScreen } = useExpandedMediaStore();
  const { enableInfiniteScroll, setEnableInfiniteScroll } = useFeedViewSettingsStore();

  return (
    <div className={styles.interfaceSettings}>
      <div className={styles.version}>
        {capitalize(t('version'))}: <Version />
      </div>
      <div className={styles.setting}>
        {capitalize(t('update'))}: <CheckForUpdates />
      </div>
      <div className={styles.setting}>
        {capitalize(t('interface_language'))}: <InterfaceLanguage />
      </div>
      <div className={styles.setting}>
        {capitalize(t('style'))}: <StyleSelector />
      </div>
      <div className={styles.setting}>
        <label>
          <input type='checkbox' checked={fitExpandedImagesToScreen} onChange={(e) => setFitExpandedImagesToScreen(e.target.checked)} />
          {capitalize(t('fit_expanded_images_to_screen'))}
        </label>
        <div className={styles.settingTip}>{capitalize(t('fit_expanded_images_to_screen_tip'))}</div>
      </div>
      <div className={styles.setting}>
        <label>
          <input type='checkbox' checked={enableInfiniteScroll} onChange={(e) => setEnableInfiniteScroll(e.target.checked)} />
          {capitalize(t('enable_infinite_scroll'))}
        </label>
        <div className={styles.settingTip}>{capitalize(t('enable_infinite_scroll_tip'))}</div>
      </div>
    </div>
  );
};

export default memo(InterfaceSettings);
