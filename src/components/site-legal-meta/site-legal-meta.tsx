import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Version from '../version/version';
import styles from './site-legal-meta.module.css';

type SiteLegalMetaOrder = 'version-first' | 'license-first';

type SiteLegalMetaProps = {
  /** Order of blocks: version-first (homepage) or license-first (board/post footer) */
  order?: SiteLegalMetaOrder;
};

const LicenseText = () => {
  const { t } = useTranslation();

  return (
    <span className={styles.licenseText}>
      {t('site_legal_meta_license_text')} {t('site_legal_meta_powered_by')} Bitsocial
      <a className={styles.bitsocialLogoLink} href='https://bitsocial.net' target='_blank' rel='noopener noreferrer' aria-label='Bitsocial'>
        <img className={styles.bitsocialLogo} src='assets/logo/bitsocial.png' alt='' width='18' height='18' />
      </a>
    </span>
  );
};

const VersionFeedbackContributors = () => {
  const { t } = useTranslation();

  return (
    <>
      <Version /> • <Link to='/q'>Feedback</Link> •{' '}
      <a href='https://github.com/bitsocialnet/5chan/graphs/contributors' target='_blank' rel='noopener noreferrer'>
        {t('site_legal_meta_contributors_link')}
      </a>
    </>
  );
};

const SiteLegalMeta = ({ order = 'version-first' }: SiteLegalMetaProps) => {
  const first = order === 'version-first' ? <VersionFeedbackContributors /> : <LicenseText />;
  const second = order === 'version-first' ? <LicenseText /> : <VersionFeedbackContributors />;

  if (order === 'version-first') {
    return (
      <>
        <br />
        {first}
        <br />
        <br />
        <br />
        {second}
      </>
    );
  }

  return (
    <>
      {first}
      <br />
      <span style={{ display: 'block', marginTop: 5 }}>{second}</span>
    </>
  );
};

export default SiteLegalMeta;
