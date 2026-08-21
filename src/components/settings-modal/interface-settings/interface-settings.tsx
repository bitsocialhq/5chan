import { memo, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './interface-settings.module.css';
import capitalize from 'lodash/capitalize';
import useExpandedMediaStore from '../../../stores/use-expanded-media-store';
import useFeedViewSettingsStore from '../../../stores/use-feed-view-settings-store';
import Version from '../../version';
import StyleSelector from '../../style-selector/style-selector';
import LazySection, { createSectionLoader } from '../lazy-section';
import { INTERFACE_LANGUAGE_STORAGE_KEY, SUPPORTED_INTERFACE_LANGUAGES } from '../../../lib/constants';

const shouldRenderAppUpdateSetting = import.meta.env.VITE_APP_DISTRIBUTION !== 'fdroid';
const loadAppUpdateSetting = createSectionLoader(() => import('./app-update-setting'));

// This module is itself preloaded while settings is open, so start the update
// setting's chunk here rather than when the interface section first renders.
if (shouldRenderAppUpdateSetting) {
  loadAppUpdateSetting();
}

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
  const { fitExpandedImagesToScreen, setFitExpandedImagesToScreen, setUnmuteExpandedVideoSound, unmuteExpandedVideoSound } = useExpandedMediaStore();
  const { enableInfiniteScroll, setEnableInfiniteScroll } = useFeedViewSettingsStore();

  return (
    <div className={styles.interfaceSettings}>
      <div className={styles.version}>
        {capitalize(t('version'))}: <Version />
      </div>
      {shouldRenderAppUpdateSetting && (
        <Suspense fallback={null}>
          <LazySection load={loadAppUpdateSetting} />
        </Suspense>
      )}
      <div className={styles.setting}>
        {capitalize(t('interface_language'))}: <InterfaceLanguage />
      </div>
      <div className={styles.setting}>
        {capitalize(t('style'))}: <StyleSelector />
      </div>
      <div className={styles.setting}>
        <label>
          <input
            type='checkbox'
            aria-label={capitalize(t('fit_expanded_images_to_screen'))}
            checked={fitExpandedImagesToScreen}
            onChange={(e) => setFitExpandedImagesToScreen(e.target.checked)}
          />
          {capitalize(t('fit_expanded_images_to_screen'))}
        </label>
        <div className={styles.settingTip}>{capitalize(t('fit_expanded_images_to_screen_tip'))}</div>
      </div>
      <div className={styles.setting}>
        <label>
          <input
            type='checkbox'
            aria-label={capitalize(t('unmute_video_sound'))}
            checked={unmuteExpandedVideoSound}
            onChange={(e) => setUnmuteExpandedVideoSound(e.target.checked)}
          />
          {capitalize(t('unmute_video_sound'))}
        </label>
        <div className={styles.settingTip}>{capitalize(t('unmute_video_sound_tip'))}</div>
      </div>
      <div className={styles.setting}>
        <label>
          <input
            type='checkbox'
            aria-label={capitalize(t('enable_infinite_scroll'))}
            checked={enableInfiniteScroll}
            onChange={(e) => setEnableInfiniteScroll(e.target.checked)}
          />
          {capitalize(t('enable_infinite_scroll'))}
        </label>
        <div className={styles.settingTip}>{capitalize(t('enable_infinite_scroll_tip'))}</div>
      </div>
    </div>
  );
};

export default memo(InterfaceSettings);
