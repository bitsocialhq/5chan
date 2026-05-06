import { useTranslation } from 'react-i18next';
import { currentAppVersion } from '../../lib/app-version';

const commitRef = `${import.meta.env.VITE_COMMIT_REF || ''}`.trim();
const shortCommitRef = commitRef.slice(0, 7);
const isElectron = window.electronApi?.isElectron === true;

const Version = () => {
  const { t } = useTranslation();
  return (
    <>
      <a href={`https://github.com/bitsocialnet/5chan/releases/tag/v${currentAppVersion}`} target='_blank' rel='noopener noreferrer'>
        v{currentAppVersion}
      </a>
      {shortCommitRef ? (
        <a
          href={`https://github.com/bitsocialnet/5chan/commit/${commitRef}`}
          target='_blank'
          rel='noopener noreferrer'
          aria-label={`View commit ${shortCommitRef} on GitHub`}
          title={`Unreleased commit ${shortCommitRef}`}
        >
          #{shortCommitRef}
        </a>
      ) : null}
      {isElectron && (
        <>
          {' '}
          -{' '}
          <a href='http://localhost:50019/webui/' target='_blank' rel='noreferrer'>
            {t('node_stats')}
          </a>
        </>
      )}
    </>
  );
};

export default Version;
