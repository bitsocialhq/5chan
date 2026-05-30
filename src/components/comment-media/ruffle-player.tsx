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

type RufflePlayerStatus = 'loading' | 'ready' | 'failed';

const RufflePlayer = ({ url }: RufflePlayerProps) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLSpanElement>(null);
  const [status, setStatus] = useState<RufflePlayerStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    let player: RufflePlayerElement | undefined;
    const mountNode = containerRef.current;

    const mountPlayer = async () => {
      setStatus('loading');
      if (mountNode) {
        mountNode.textContent = '';
      }

      try {
        await loadRuffle();

        if (cancelled || !mountNode) {
          return;
        }

        const ruffle = window.RufflePlayer?.newest?.();
        player = ruffle?.createPlayer?.();
        if (!player) {
          throw new Error('Ruffle player API unavailable');
        }

        player.className = styles.rufflePlayerElement;
        player.setAttribute('data-testid', 'ruffle-player');
        mountNode.appendChild(player);

        const playerApi = player.ruffle?.();
        if (!playerApi) {
          throw new Error('Ruffle player instance unavailable');
        }

        await playerApi.load({
          ...getRuffleConfig(),
          url,
        });
        if (!cancelled) {
          setStatus('ready');
        }
      } catch (error) {
        console.error('Error loading SWF with Ruffle:', error);
        if (!cancelled) {
          setStatus('failed');
        }
      }
    };

    void mountPlayer();

    return () => {
      cancelled = true;
      player?.remove();
      if (mountNode) {
        mountNode.textContent = '';
      }
    };
  }, [url]);

  return (
    <span className={styles.rufflePlayer}>
      <span className={status === 'ready' ? styles.rufflePlayerMount : styles.rufflePlayerMountHidden} ref={containerRef} />
      {status === 'failed' ? (
        <span className={styles.ruffleFallback}>
          {t('media_failed_to_load')}.{' '}
          <a href={url} target='_blank' rel='noopener noreferrer'>
            {t('media_failed_to_load_open_source')}
          </a>
        </span>
      ) : status === 'loading' ? (
        <span className={styles.ruffleLoading}>{t('loading')} SWF</span>
      ) : null}
    </span>
  );
};

export default RufflePlayer;
