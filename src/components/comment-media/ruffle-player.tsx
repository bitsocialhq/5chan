import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './comment-media.module.css';

const RUFFLE_CONFIG = {
  allowFullscreen: false,
  allowNetworking: 'internal',
  allowScriptAccess: false,
  autoplay: 'off',
  openUrlMode: 'confirm',
  polyfills: false,
  showSwfDownload: false,
} as const;

let ruffleLoadPromise: Promise<void> | undefined;

const getRufflePublicPath = () => new URL('ruffle/', document.baseURI).href;

const getRuffleConfig = () => ({
  ...window.RufflePlayer?.config,
  ...RUFFLE_CONFIG,
  publicPath: getRufflePublicPath(),
});

const loadRuffle = async () => {
  if (!ruffleLoadPromise) {
    window.RufflePlayer = window.RufflePlayer || {};
    window.RufflePlayer.config = getRuffleConfig();
    ruffleLoadPromise = import('@ruffle-rs/ruffle')
      .then(() => undefined)
      .catch((error: unknown) => {
        ruffleLoadPromise = undefined;
        throw error;
      });
  }

  return ruffleLoadPromise;
};

interface RufflePlayerProps {
  url: string;
}

const RufflePlayer = ({ url }: RufflePlayerProps) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLSpanElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let player: RufflePlayerElement | undefined;

    const mountPlayer = async () => {
      setFailed(false);

      try {
        await loadRuffle();

        if (cancelled || !containerRef.current) {
          return;
        }

        const ruffle = window.RufflePlayer?.newest?.();
        player = ruffle?.createPlayer?.();
        if (!player) {
          throw new Error('Ruffle player API unavailable');
        }

        player.className = styles.rufflePlayerElement;
        player.setAttribute('data-testid', 'ruffle-player');
        containerRef.current.textContent = '';
        containerRef.current.appendChild(player);

        const playerApi = player.ruffle?.();
        if (!playerApi) {
          throw new Error('Ruffle player instance unavailable');
        }

        await playerApi.load({
          ...getRuffleConfig(),
          url,
        });
      } catch (error) {
        console.error('Error loading SWF with Ruffle:', error);
        if (!cancelled) {
          setFailed(true);
        }
      }
    };

    void mountPlayer();

    return () => {
      cancelled = true;
      player?.remove();
    };
  }, [url]);

  return (
    <span className={styles.rufflePlayer} ref={containerRef}>
      {failed ? (
        <span className={styles.ruffleFallback}>
          {t('media_failed_to_load')}.{' '}
          <a href={url} target='_blank' rel='noopener noreferrer'>
            {t('media_failed_to_load_open_source')}
          </a>
        </span>
      ) : (
        <span className={styles.ruffleLoading}>{t('loading')} SWF</span>
      )}
    </span>
  );
};

export default RufflePlayer;
