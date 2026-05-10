import { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Challenge as ChallengeType, useAccount, useComment } from '@bitsocial/bitsocial-react-hooks';
import { getPublicationPreview, getPublicationType, getVotePreview } from '../../lib/utils/challenge-utils';
import useIsMobile from '../../hooks/use-is-mobile';
import useChallengesStore from '../../stores/use-challenges-store';
import useTrustedBoardUrlPermissionsStore from '../../stores/use-trusted-board-url-permissions-store';
import useTheme from '../../hooks/use-theme';
import styles from './challenge-modal.module.css';
import capitalize from 'lodash/capitalize';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import getShortAddress from '../../lib/get-short-address';

const useParentAddress = (parentCid?: string) => {
  const parentComment = useComment({ commentCid: parentCid, onlyIfCached: true });
  return parentComment?.author?.shortAddress;
};

interface ChallengeProps {
  challenge: ChallengeType;
  closeModal: () => void;
  abandonModal: () => void;
}

const getDisplayCommunityAddress = (shortCommunityAddress?: string, communityAddress?: string) =>
  shortCommunityAddress || (communityAddress ? getShortAddress(communityAddress) : '') || communityAddress || '';

const stripLegacyIframeConfirmDetails = (message: string) => message.split(/\r?\n\s*\r?\n/)[0] ?? message;

const TextChallenge = ({ challenge }: { challenge: string }) => <div className={styles.challengeMedia}>{challenge}</div>;

const MAX_IMAGE_CHALLENGE_BASE64_LENGTH = 2_000_000;
const isSafeBase64ImageChallenge = (challenge: string) => /^[A-Za-z0-9+/]*={0,2}$/.test(challenge) && challenge.length <= MAX_IMAGE_CHALLENGE_BASE64_LENGTH;

const ImageChallenge = ({ challenge }: { challenge: string }) =>
  isSafeBase64ImageChallenge(challenge) ? (
    <img alt='Challenge' className={styles.challengeMedia} src={`data:image/png;base64,${challenge}`} />
  ) : (
    <div className={styles.challengeMedia}>Invalid image challenge</div>
  );

const isLocalIframeHostname = (hostname: string) => hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname.endsWith('.localhost');

type ValidatedIframeUrl = { status: 'valid'; finalUrl: string; origin: string } | { status: 'invalid'; error: unknown } | { status: 'unsupported' };

const validateIframeChallengeUrl = (iframeUrl: string, theme: string): ValidatedIframeUrl => {
  let validatedUrl: URL;
  try {
    validatedUrl = new URL(iframeUrl);
  } catch (error) {
    return { status: 'invalid', error };
  }

  const isHttps = validatedUrl.protocol === 'https:';
  const isLocalHttp = validatedUrl.protocol === 'http:' && isLocalIframeHostname(validatedUrl.hostname);
  if (!isHttps && !isLocalHttp) {
    return { status: 'unsupported' };
  }

  validatedUrl.pathname = validatedUrl.pathname.replace(/\/{2,}/g, '/');
  validatedUrl.searchParams.set('theme', theme);
  return { status: 'valid', finalUrl: validatedUrl.toString(), origin: validatedUrl.origin };
};

const postThemeToIframe = (iframe: HTMLIFrameElement | null, iframeOrigin: string, theme: string) => {
  if (!iframe || !iframeOrigin) return;
  try {
    iframe.contentWindow?.postMessage({ type: 'plebbit-theme', theme, source: 'plebbit-5chan' }, iframeOrigin);
  } catch (error) {
    console.warn('Could not send theme to iframe:', error);
  }
};

const getReadableIframeUrl = (challengeUrl: string) => {
  try {
    const url = new URL(challengeUrl);
    return url.host || url.hostname;
  } catch {
    return '';
  }
};

const getIframeSessionId = (challengeUrl: string) => {
  try {
    const url = new URL(challengeUrl);
    const match = url.pathname.match(/\/iframe\/([^/?#]+)/);
    return match?.[1] ?? '';
  } catch {
    return '';
  }
};

interface IframeChallengeProps {
  challenge: string;
  confirmMessage: string;
  onCancel: () => void;
  onDone: () => void;
  onAutoComplete: (challengeAnswers: string[]) => void;
  onReady: () => void;
  openLabel: string;
  closeLabel: string;
  rememberPermissionLabel: string;
  publicationDetails: React.ReactNode;
}

type IframeOpenMode = 'trusted' | 'manual';

const IframeChallenge = ({
  challenge,
  confirmMessage,
  onCancel,
  onDone,
  onAutoComplete,
  onReady,
  openLabel,
  closeLabel,
  rememberPermissionLabel,
  publicationDetails,
}: IframeChallengeProps) => {
  const account = useAccount();
  const [theme] = useTheme();
  const trustOrigin = useTrustedBoardUrlPermissionsStore((state) => state.trustOrigin);
  const [iframeUrlState, setIframeUrl] = useState('');
  const [iframeOrigin, setIframeOrigin] = useState('');
  const [inlineErrorMessage, setInlineErrorMessage] = useState('');
  const [rememberPermission, setRememberPermission] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const attemptedLoadRef = useRef(false);
  const mountedRef = useRef(false);
  const handledAutoCompleteRef = useRef(false);
  const onAutoCompleteRef = useRef(onAutoComplete);
  onAutoCompleteRef.current = onAutoComplete;
  const expectedSessionId = getIframeSessionId(challenge);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const openValidatedIframe = useCallback(
    (validatedUrl: { finalUrl: string; origin: string }) => {
      queueMicrotask(() => {
        if (!mountedRef.current) return;
        setIframeUrl(validatedUrl.finalUrl);
        setIframeOrigin(validatedUrl.origin);
        onReady();
      });
    },
    [onReady],
  );

  const handleLoadIframe = useCallback(
    (mode: IframeOpenMode) => {
      if (attemptedLoadRef.current) return;
      const iframeUrl = challenge;
      if (!iframeUrl) return;

      const rejectChallenge = (message: string) => {
        attemptedLoadRef.current = true;
        setInlineErrorMessage(message);
      };

      const rawUserAddress = account?.author?.address?.trim();
      const requiresUserAddress = iframeUrl.includes('{userAddress}');

      if (requiresUserAddress && !rawUserAddress) {
        rejectChallenge('Error: Unable to load challenge without your address. Please sign in and try again.');
        return;
      }

      const encodedAddress = rawUserAddress ? encodeURIComponent(rawUserAddress) : undefined;
      const replacedUrl = requiresUserAddress && encodedAddress ? iframeUrl.replace(/\{userAddress\}/g, encodedAddress) : iframeUrl;

      const validatedUrl = validateIframeChallengeUrl(replacedUrl, theme);
      if (validatedUrl.status === 'unsupported') {
        rejectChallenge('Error: Only HTTPS iframe challenges or localhost HTTP challenges are supported');
        return;
      }
      if (validatedUrl.status === 'invalid') {
        console.error('Invalid iframe challenge URL', { error: validatedUrl.error });
        rejectChallenge('Error: Invalid URL for authentication challenge');
        return;
      }

      const isTrusted = useTrustedBoardUrlPermissionsStore.getState().isOriginTrusted(validatedUrl.origin);
      if (!isTrusted && mode === 'trusted') {
        return;
      }
      attemptedLoadRef.current = true;
      if (!isTrusted && rememberPermission) {
        trustOrigin(validatedUrl.origin, getReadableIframeUrl(replacedUrl), null);
      }
      openValidatedIframe(validatedUrl);
    },
    [account, challenge, openValidatedIframe, rememberPermission, theme, trustOrigin],
  );

  useEffect(() => {
    handleLoadIframe('trusted');
  }, [handleLoadIframe]);

  const handleInlineConfirm = useCallback(() => {
    handleLoadIframe('manual');
  }, [handleLoadIframe]);

  const handleInlineCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const sendThemeToIframe = useCallback(() => {
    postThemeToIframe(iframeRef.current, iframeOrigin, theme);
  }, [iframeOrigin, theme]);

  const handleIframeLoad = () => {
    sendThemeToIframe();
  };

  useEffect(() => {
    if (iframeRef.current && iframeUrlState && iframeOrigin) {
      sendThemeToIframe();
    }
  }, [iframeOrigin, iframeUrlState, sendThemeToIframe]);

  useEffect(() => {
    if (!iframeOrigin || !expectedSessionId) {
      handledAutoCompleteRef.current = false;
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== iframeOrigin) return;
      if (handledAutoCompleteRef.current) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if ((data as { type?: string }).type !== 'challengeAnswer') return;
      const challengeAnswers = (data as { challengeAnswers?: unknown }).challengeAnswers;
      if (!Array.isArray(challengeAnswers)) return;
      const sessionId = (data as { sessionId?: unknown }).sessionId;
      if (sessionId !== expectedSessionId) return;
      handledAutoCompleteRef.current = true;
      onAutoCompleteRef.current(challengeAnswers.filter((answer): answer is string => typeof answer === 'string'));
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [expectedSessionId, iframeOrigin]);

  if (!iframeUrlState) {
    return (
      <>
        {publicationDetails}
        <div className={`${styles.challengeMediaWrapper} ${styles.iframeConsentWrapper}`}>
          <div className={styles.iframeConsentMessage}>{inlineErrorMessage || confirmMessage}</div>
          {!inlineErrorMessage && (
            <label className={styles.iframeTrustCheckbox}>
              <input type='checkbox' checked={rememberPermission} onChange={(event) => setRememberPermission(event.target.checked)} />
              {rememberPermissionLabel}
            </label>
          )}
        </div>
        <div className={`${styles.challengeFooter} ${styles.iframeFooter}`}>
          <span>
            {!inlineErrorMessage && (
              <button type='button' onClick={handleInlineConfirm}>
                {openLabel}
              </button>
            )}
            <button type='button' onClick={handleInlineCancel}>
              {closeLabel}
            </button>
          </span>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={`${styles.challengeMediaWrapper} ${styles.iframeWrapper}`}>
        <iframe
          ref={iframeRef}
          src={iframeUrlState}
          sandbox='allow-scripts allow-forms allow-popups allow-same-origin allow-top-navigation-by-user-activation'
          onLoad={handleIframeLoad}
          className={styles.iframe}
          title='Challenge authentication'
        />
      </div>
      <div className={`${styles.challengeFooter} ${styles.iframeFooter}`}>
        <div className={styles.iframeCloseButton}>
          <button onClick={onDone}>Close challenge</button>
        </div>
      </div>
    </>
  );
};

const Challenge = ({ challenge, closeModal, abandonModal }: ChallengeProps) => {
  const { t } = useTranslation();

  const challenges = challenge?.[0]?.challenges;
  const publication = challenge?.[1];
  const publicationTarget = challenge?.[2];

  const publicationType = getPublicationType(publication);
  const publicationContent = publicationType === 'vote' ? getPublicationPreview(publicationTarget) : getPublicationPreview(publication);
  const votePreview = getVotePreview(publication);

  const { author, content, link, title, parentCid, shortCommunityAddress, communityAddress } = publication || {};
  const { displayName } = author || {};
  const parentAddress = useParentAddress(parentCid);
  const community = shortCommunityAddress || communityAddress;

  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [readyIframeChallengeKey, setReadyIframeChallengeKey] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const nodeRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const [{ x, y }, api] = useSpring(() => ({
    x: window.innerWidth / 2 - 150,
    y: window.innerHeight / 2 - 200,
  }));

  const currentChallenge = challenges?.[currentChallengeIndex];
  const iframeChallengeKey = `${currentChallengeIndex}:${currentChallenge?.challenge ?? ''}`;
  const isTextChallenge = currentChallenge?.type === 'text/plain';
  const isImageChallenge = currentChallenge?.type === 'image/png';
  const isIframeChallenge = currentChallenge?.type === 'url/iframe';

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const bind = useDrag(
    ({ active, event, offset: [ox, oy] }) => {
      if (active) {
        event.preventDefault();
        Object.assign(document.body.style, { userSelect: 'none', webkitUserSelect: 'none' });
      } else {
        Object.assign(document.body.style, { userSelect: '', webkitUserSelect: '' });
      }
      api.start({ x: ox, y: oy, immediate: true });
    },
    {
      from: () => [x.get(), y.get()],
      filterTaps: true,
      bounds: undefined,
    },
  );

  const isValidAnswer = (index: number) => !!answers[index] && answers[index].trim() !== '';

  const onAnswersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAnswers((prevAnswers) => {
      const updatedAnswers = [...prevAnswers];
      updatedAnswers[currentChallengeIndex] = e.target.value;
      return updatedAnswers;
    });
  };

  const onSubmit = () => {
    if (!publication) return;
    publication.publishChallengeAnswers(answers);
    setAnswers([]);
    closeModal();
  };

  const onIframeDone = useCallback(() => {
    if (!publication) return;
    publication.publishChallengeAnswers(['']);
    closeModal();
  }, [closeModal, publication]);

  const onIframeAutoComplete = useCallback(
    (challengeAnswers: string[]) => {
      if (!publication) return;
      publication.publishChallengeAnswers(challengeAnswers);
      closeModal();
    },
    [closeModal, publication],
  );

  const onIframeReady = useCallback(() => {
    setReadyIframeChallengeKey(iframeChallengeKey);
  }, [iframeChallengeKey]);

  const onEnterKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    if (!isValidAnswer(currentChallengeIndex)) return;
    if (challenges?.[currentChallengeIndex + 1]) {
      setCurrentChallengeIndex((prev) => prev + 1);
    } else {
      onSubmit();
    }
  };

  useEffect(() => {
    const onEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        abandonModal();
      }
    };
    document.addEventListener('keydown', onEscapeKey);
    return () => document.removeEventListener('keydown', onEscapeKey);
  }, [abandonModal]);

  const getChallengeUrl = useCallback(() => {
    const iframeUrl = currentChallenge?.challenge;
    if (!iframeUrl) return '';
    return getReadableIframeUrl(iframeUrl);
  }, [currentChallenge]);
  const readableUrl = getChallengeUrl();

  if (!challenges?.length || !publication || !currentChallenge) {
    return null;
  }

  const isIframeVisible = isIframeChallenge && readyIframeChallengeKey === iframeChallengeKey;

  const containerClasses = [styles.container];
  if (isIframeVisible) {
    containerClasses.push(styles.iframeContainer);
  }

  const extraTitleParts: string[] = [];
  if (community) extraTitleParts.push(`p/${community}`);
  if (publicationType === 'vote' && votePreview) extraTitleParts.push(votePreview.trim());
  if (publication?.parentCid) extraTitleParts.push(parentAddress ? `reply ${parentAddress}` : 'reply');
  if (publicationContent && publicationType !== 'vote') extraTitleParts.push(publicationContent);

  const mobileX = isIframeVisible ? 5 : window.innerWidth / 2 - 150;
  const mobileY = isIframeVisible ? Math.max(10, (window.innerHeight - 600) / 2) : window.innerHeight / 2 - 200;
  const displayCommunityAddress = getDisplayCommunityAddress(shortCommunityAddress, communityAddress) || t('board');
  const iframeConfirmMessage = stripLegacyIframeConfirmDetails(
    t('iframe_challenge_confirm', {
      board: displayCommunityAddress,
      interpolation: { escapeValue: false },
      site: readableUrl || t('webpage'),
    }),
  );
  const challengeTitle = `Challenge for ${publicationType || t('post')}`;

  const publicationDetails = (
    <>
      <div className={styles.name}>
        <input type='text' value={displayName || capitalize(t('anonymous'))} disabled readOnly />
      </div>
      {title && (
        <div className={styles.subject}>
          <input type='text' value={title} disabled readOnly />
        </div>
      )}
      {content && (
        <div className={styles.content}>
          <textarea value={content} disabled readOnly cols={48} rows={4} wrap='soft' />
        </div>
      )}
      {link && (
        <div className={styles.link}>
          <input type='text' value={link} disabled readOnly />
        </div>
      )}
    </>
  );

  return (
    <animated.div
      className={containerClasses.join(' ')}
      ref={nodeRef}
      role='dialog'
      aria-modal='true'
      aria-labelledby='challenge-modal-title'
      style={{
        x: isMobile ? mobileX : x.to((value) => Math.round(value)),
        y: isMobile ? mobileY : y.to((value) => Math.round(value)),
        touchAction: 'none',
      }}
    >
      <div id='challenge-modal-title' className={`challengeHandle ${styles.title}`} {...(!isMobile ? bind() : {})}>
        {challengeTitle}
        <button type='button' className={styles.closeIcon} onClick={abandonModal} title='close' aria-label={t('close')} />
      </div>
      <div className={styles.publication}>
        {isIframeChallenge ? (
          <IframeChallenge
            key={currentChallengeIndex}
            challenge={currentChallenge?.challenge ?? ''}
            confirmMessage={iframeConfirmMessage}
            onCancel={abandonModal}
            onDone={onIframeDone}
            onAutoComplete={onIframeAutoComplete}
            onReady={onIframeReady}
            openLabel={capitalize(t('open'))}
            closeLabel={t('close')}
            rememberPermissionLabel={t('trusted_board_link_checkbox')}
            publicationDetails={publicationDetails}
          />
        ) : (
          <>
            {publicationDetails}
            <div className={styles.challengeContainer}>
              <input
                ref={inputRef}
                className={styles.challengeAnswer}
                type='text'
                autoComplete='off'
                autoCorrect='off'
                spellCheck='false'
                placeholder='TYPE THE ANSWER HERE AND PRESS ENTER'
                onKeyDown={onEnterKey}
                onChange={onAnswersChange}
                value={answers[currentChallengeIndex] || ''}
              />
              <div className={styles.challengeMediaWrapper}>
                {isTextChallenge && <TextChallenge challenge={currentChallenge?.challenge ?? ''} />}
                {isImageChallenge && <ImageChallenge challenge={currentChallenge?.challenge ?? ''} />}
              </div>
            </div>
            <div className={styles.challengeFooter}>
              <div className={styles.counter}>{t('challenge_counter', { index: currentChallengeIndex + 1, total: challenges?.length })}</div>
              <span className={styles.buttons}>
                {!challenges?.[currentChallengeIndex + 1] && (
                  <button onClick={onSubmit} disabled={!isValidAnswer(currentChallengeIndex)}>
                    {t('submit')}
                  </button>
                )}
                <button onClick={abandonModal}>Cancel</button>
                {challenges?.length > 1 && (
                  <button disabled={!challenges?.[currentChallengeIndex - 1]} onClick={() => setCurrentChallengeIndex((prev) => prev - 1)}>
                    {t('previous')}
                  </button>
                )}
                {challenges?.[currentChallengeIndex + 1] && <button onClick={() => setCurrentChallengeIndex((prev) => prev + 1)}>{t('next')}</button>}
              </span>
            </div>
          </>
        )}
      </div>
    </animated.div>
  );
};

const ChallengeModal = () => {
  const { challenges, removeChallenge, abandonCurrentChallenge } = useChallengesStore();
  const isOpen = !!challenges.length;
  const closeModal = () => removeChallenge();
  const abandonModal = () => {
    void abandonCurrentChallenge();
  };
  const current = challenges[0];
  const challenge = current?.challenge;
  const challengeId = current?.id ?? 0;

  return isOpen && challenge ? <Challenge key={challengeId} challenge={challenge} closeModal={closeModal} abandonModal={abandonModal} /> : null;
};

export default ChallengeModal;
