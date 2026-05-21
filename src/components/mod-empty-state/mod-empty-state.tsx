import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import styles from './mod-empty-state.module.css';

const MOD_ACCOUNT_SETTINGS_LINK_COMPONENTS = {
  1: <Link to='/mod/settings#account-settings' />,
};

const ModEmptyState = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.modEmptyState} role='status'>
      <div className={styles.modEmptyStateTitle}>{t('not_mod_of_any_board')}</div>
      <div className={styles.modEmptyStateAction}>
        <Trans i18nKey='go_to_settings_to_import_mod_account' components={MOD_ACCOUNT_SETTINGS_LINK_COMPONENTS} />
      </div>
    </div>
  );
};

export default ModEmptyState;
