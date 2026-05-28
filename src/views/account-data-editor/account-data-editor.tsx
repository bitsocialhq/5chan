import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { setAccount, useAccount } from '@bitsocial/bitsocial-react-hooks';
import { buildEditableAccountJson, safeParseAccountJson, buildSavePayload } from '../../lib/utils/account-editor-utils';
import styles from './account-data-editor.module.css';

const DEFAULT_RETURN_TO = '/subs/settings#account-settings';

type AceModuleLoadResult = {
  Editor: React.ComponentType<any>;
  onBeforeLoad: (ace: { config?: { setModuleUrl?: (name: string, value: string) => void } }) => void;
};

type EditorPhase = 'warning' | 'loading' | 'editor' | 'fallback';

type EditorState = {
  phase: EditorPhase;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AceEditor: React.ComponentType<any> | null;
  aceOnBeforeLoad: AceModuleLoadResult['onBeforeLoad'] | undefined;
  text: string;
};

const loadAce = async () => {
  const aceModulePromise = import('react-ace');
  const workerJsonModulePromise = import('ace-builds/src-noconflict/worker-json?url');
  const modeJsonPromise = import('ace-builds/src-noconflict/mode-json');
  const themeMonokaiPromise = import('ace-builds/src-noconflict/theme-monokai');
  const resolverPromise = aceModulePromise.then(() => import('ace-builds/esm-resolver'));
  const [aceModule, workerJsonModule] = await Promise.all([aceModulePromise, workerJsonModulePromise, resolverPromise, modeJsonPromise, themeMonokaiPromise]);
  // esm-resolver waits for react-ace so it can see the global ace instance.
  const mod = aceModule.default;
  const Editor = typeof mod === 'function' ? mod : (mod as unknown as { default: typeof mod }).default;

  return {
    Editor,
    onBeforeLoad: (ace) => {
      ace.config?.setModuleUrl?.('ace/mode/json_worker', workerJsonModule.default);
    },
  } satisfies AceModuleLoadResult;
};

const AccountDataEditor = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const account = useAccount();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? DEFAULT_RETURN_TO;

  const [{ phase, AceEditor, aceOnBeforeLoad, text }, setEditorState] = useState<EditorState>({
    phase: 'warning',
    AceEditor: null,
    aceOnBeforeLoad: undefined,
    text: '',
  });

  useEffect(() => {
    if (phase !== 'loading') return;
    loadAce()
      .then(({ Editor, onBeforeLoad }) => {
        setEditorState({
          phase: 'editor',
          AceEditor: Editor,
          aceOnBeforeLoad: onBeforeLoad,
          text: buildEditableAccountJson(account),
        });
      })
      .catch(() => {
        setEditorState({
          phase: 'fallback',
          AceEditor: null,
          aceOnBeforeLoad: undefined,
          text: buildEditableAccountJson(account),
        });
      });
  }, [phase, account]);

  const handleGoBack = () => navigate(returnTo);
  const handleContinue = () => setEditorState((current) => ({ ...current, phase: 'loading' }));
  const handleReset = () => setEditorState((current) => ({ ...current, text: buildEditableAccountJson(account) }));
  const handleReturn = () => navigate(returnTo);

  const handleSave = async () => {
    const parsed = safeParseAccountJson(text);
    if (!parsed) {
      alert('Invalid JSON');
      return;
    }
    const payload = buildSavePayload(parsed, account?.id);
    try {
      await setAccount(payload);
      navigate(returnTo);
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error saving');
    }
  };

  if (phase === 'warning') {
    return (
      <div className={styles.container}>
        <div className={styles.warningGate}>
          <div className={styles.warningTitle}>{t('private_key_warning_title')}</div>
          <div className={styles.warningDescription}>{t('private_key_warning_description')}</div>
          <div className={styles.warningButtons}>
            <button type='button' onClick={handleGoBack}>
              {t('go_back')}
            </button>
            <button type='button' onClick={handleContinue}>
              {t('continue')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.loadingMessage}>{t('loading_editor')}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {phase === 'fallback' && <div className={styles.fallbackWarning}>{t('editor_fallback_warning')}</div>}
      <div className={styles.editorContainer}>
        {phase === 'editor' && AceEditor ? (
          <AceEditor
            mode='json'
            theme='monokai'
            width='100%'
            height='500px'
            fontSize={13}
            showPrintMargin={false}
            value={text}
            onChange={(nextText: string) => setEditorState((current) => ({ ...current, text: nextText }))}
            onBeforeLoad={aceOnBeforeLoad}
          />
        ) : (
          <textarea
            aria-label={t('account_data')}
            value={text}
            onChange={(e) => setEditorState((current) => ({ ...current, text: e.target.value }))}
            style={{ width: '100%', height: '500px', fontFamily: 'monospace', fontSize: 13 }}
            spellCheck={false}
          />
        )}
      </div>
      <div className={styles.controls}>
        <button type='button' onClick={handleSave}>
          {t('save_changes')}
        </button>
        <button type='button' onClick={handleReset}>
          {t('reset_changes')}
        </button>
        <button type='button' onClick={handleReturn}>
          {t('return_to_settings')}
        </button>
      </div>
    </div>
  );
};

export default AccountDataEditor;
