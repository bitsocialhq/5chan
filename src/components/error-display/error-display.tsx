import { useReducer, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import capitalize from 'lodash/capitalize';
import { copyToClipboard } from '../../lib/utils/clipboard-utils';
import { formatErrorForDisplay, serializeErrorForClipboard } from '../../lib/utils/error-utils';
import styles from './error-display.module.css';

type FeedbackMessageKey = 'copied' | 'failed' | null;
type State = { showAfterDelay: boolean; feedbackMessageKey: FeedbackMessageKey };

function reducer(state: State, action: { type: 'RESET_DELAY' } | { type: 'SHOW' } | { type: 'FEEDBACK'; payload: FeedbackMessageKey }): State {
  if (action.type === 'RESET_DELAY') return { ...state, showAfterDelay: false };
  if (action.type === 'SHOW') return { ...state, showAfterDelay: true };
  if (action.type === 'FEEDBACK') return { ...state, feedbackMessageKey: action.payload };
  return state;
}

type ErrorDisplayProps = {
  error: unknown;
  displayMessage?: string;
  inline?: boolean;
  showImmediately?: boolean;
};

const ErrorDisplay = ({ error, displayMessage, inline = false, showImmediately = false }: ErrorDisplayProps) => {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(reducer, { showAfterDelay: showImmediately, feedbackMessageKey: null });

  const hasError = error !== null && error !== undefined && error !== '';

  useEffect(() => {
    if (!hasError) {
      queueMicrotask(() => dispatch({ type: 'RESET_DELAY' }));
      return;
    }
    if (showImmediately) {
      queueMicrotask(() => dispatch({ type: 'SHOW' }));
      return;
    }
    const timer = setTimeout(() => dispatch({ type: 'SHOW' }), 1000);
    return () => clearTimeout(timer);
  }, [hasError, showImmediately]);

  if (!hasError || !state.showAfterDelay) {
    return null;
  }

  const formattedError = formatErrorForDisplay(error);
  const originalDisplayMessage = displayMessage ?? (formattedError ? (typeof error === 'string' ? formattedError : `${t('error')}: ${formattedError}`) : t('error'));
  const canCopyError = hasError && !!originalDisplayMessage;

  const handleCopyError = async () => {
    if (!canCopyError || state.feedbackMessageKey) return;

    const errorString = serializeErrorForClipboard(error);
    try {
      await copyToClipboard(errorString);
      dispatch({ type: 'FEEDBACK', payload: 'copied' });
      setTimeout(() => dispatch({ type: 'FEEDBACK', payload: null }), 1500);
    } catch (err) {
      console.error('Failed to copy error: ', err);
      dispatch({ type: 'FEEDBACK', payload: 'failed' });
      setTimeout(() => dispatch({ type: 'FEEDBACK', payload: null }), 1500);
    }
  };

  const copyButtonLabel =
    state.feedbackMessageKey === 'copied' ? t('copied') : state.feedbackMessageKey === 'failed' ? t('copyFailed', 'copy failed') : t('copyFullError', 'copy full error');
  const displayCopyButtonLabel = capitalize(copyButtonLabel);
  const copyButtonClassNames = [styles.copyErrorButton];
  if (state.feedbackMessageKey === 'copied') {
    copyButtonClassNames.push(styles.feedbackSuccessMessage);
  } else if (state.feedbackMessageKey === 'failed') {
    copyButtonClassNames.push(styles.feedbackFailedMessage);
  }

  return (
    <div className={inline ? styles.inlineError : styles.error}>
      {originalDisplayMessage && <span className={styles.errorMessage}>{originalDisplayMessage}</span>}
      {canCopyError && (
        <span className={styles.copyErrorButtonWrapper}>
          <span className={styles.copyErrorBracket}>[</span>
          <button type='button' className={copyButtonClassNames.join(' ')} onClick={handleCopyError} title={t('copyFullError', 'copy full error')}>
            {displayCopyButtonLabel}
          </button>
          <span className={styles.copyErrorBracket}>]</span>
        </span>
      )}
    </div>
  );
};

export default ErrorDisplay;
