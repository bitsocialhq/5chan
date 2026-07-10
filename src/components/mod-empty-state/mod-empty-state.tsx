import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import styles from './mod-empty-state.module.css';

const MOD_ACCOUNT_SETTINGS_LINK_COMPONENTS = {
  1: <Link to='/mod/settings?section=account-settings' />,
};

const ModEmptyState = () => {
  const { t } = useTranslation();

  return (
    <output className={styles.modEmptyState}>
      <div className={styles.modEmptyStateTitle}>{t('not_mod_of_any_board')}</div>
      <div className={styles.modEmptyStateAction}>
        <Trans i18nKey='go_to_settings_to_import_mod_account' components={MOD_ACCOUNT_SETTINGS_LINK_COMPONENTS} />
      </div>
    </output>
  );
};

export default ModEmptyState;
