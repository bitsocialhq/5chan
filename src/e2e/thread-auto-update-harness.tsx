import { useEffect, useRef, useState } from 'react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { AutoButton, UpdateButton } from '../components/board-buttons/board-buttons';
import useThreadLiveUpdatesStore from '../stores/use-thread-live-updates-store';

type ReplySnapshot = {
  cid: string;
  content: string;
};

type ThreadSnapshot = {
  postLabel: string;
  replies: ReplySnapshot[];
  version: number;
};

const i18n = createInstance();
void i18n.use(initReactI18next).init({
  fallbackLng: 'en',
  initImmediate: false,
  lng: 'en',
  resources: {
    en: {
      translation: {
        Auto: 'Auto',
        update: 'update',
      },
    },
  },
});

const buildSnapshot = (version: number): ThreadSnapshot => ({
  postLabel: `OP version ${version}`,
  replies: Array.from({ length: version }, (_, index) => ({
    cid: `reply-${index + 1}`,
    content: index === 0 ? `reply 1 edited v${version}` : `reply ${index + 1} added in v${index + 1}`,
  })),
  version,
});

const Harness = () => {
  const enabled = useThreadLiveUpdatesStore((state) => state.enabled);
  const isUpdating = useThreadLiveUpdatesStore((state) => state.isUpdating);
  const updateRequestId = useThreadLiveUpdatesStore((state) => state.updateRequestId);
  const repliesResetRequestId = useThreadLiveUpdatesStore((state) => state.repliesResetRequestId);
  const startUpdate = useThreadLiveUpdatesStore((state) => state.startUpdate);
  const finishUpdate = useThreadLiveUpdatesStore((state) => state.finishUpdate);
  const resetState = useThreadLiveUpdatesStore((state) => state.resetState);
  const initialSnapshot = buildSnapshot(1);
  const [serverSnapshot, setServerSnapshot] = useState(initialSnapshot);
  const [visiblePostLabel, setVisiblePostLabel] = useState(initialSnapshot.postLabel);
  const [visibleReplies, setVisibleReplies] = useState(initialSnapshot.replies);
  const lastProcessedUpdateRequestIdRef = useRef(0);
  const lastHandledRepliesResetIdRef = useRef(0);
  const pendingRepliesRef = useRef<ReplySnapshot[] | null>(null);

  useEffect(() => {
    resetState();
    return () => {
      resetState();
    };
  }, [resetState]);

  useEffect(() => {
    if (!enabled) return;
    setVisiblePostLabel(serverSnapshot.postLabel);
    setVisibleReplies(serverSnapshot.replies);
  }, [enabled, serverSnapshot]);

  useEffect(() => {
    if (updateRequestId === 0 || updateRequestId === lastProcessedUpdateRequestIdRef.current) return;

    lastProcessedUpdateRequestIdRef.current = updateRequestId;
    const snapshotToApply = serverSnapshot;
    startUpdate();
    pendingRepliesRef.current = snapshotToApply.replies;

    const timeoutId = window.setTimeout(() => {
      setVisiblePostLabel(snapshotToApply.postLabel);
      finishUpdate(updateRequestId, true);
    }, 20);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [finishUpdate, serverSnapshot, startUpdate, updateRequestId]);

  useEffect(() => {
    if (repliesResetRequestId === 0 || repliesResetRequestId === lastHandledRepliesResetIdRef.current || !pendingRepliesRef.current) return;
    lastHandledRepliesResetIdRef.current = repliesResetRequestId;
    setVisibleReplies(pendingRepliesRef.current);
    pendingRepliesRef.current = null;
  }, [repliesResetRequestId]);

  return (
    <main style={{ fontFamily: 'sans-serif', lineHeight: 1.5, margin: '40px auto', maxWidth: 720, padding: '0 20px' }}>
      <h1>Thread Auto Update E2E</h1>
      <p>Use the real thread buttons below, then simulate incoming server updates.</p>
      <div style={{ alignItems: 'center', display: 'flex', gap: 16, marginBottom: 20 }}>
        <UpdateButton />
        <AutoButton />
        <button className='button' data-testid='simulate-server-update' onClick={() => setServerSnapshot((current) => buildSnapshot(current.version + 1))}>
          Simulate server update
        </button>
      </div>
      <div data-testid='updating-state'>{isUpdating ? 'updating' : 'idle'}</div>
      <div data-testid='server-version'>Server version {serverSnapshot.version}</div>
      <div data-testid='visible-post-label'>{visiblePostLabel}</div>
      <div data-testid='visible-replies-count'>{visibleReplies.length}</div>
      <div data-testid='visible-first-reply'>{visibleReplies[0]?.content ?? 'no replies'}</div>
      <ul data-testid='visible-replies-list'>
        {visibleReplies.map((reply) => (
          <li key={reply.cid}>{reply.content}</li>
        ))}
      </ul>
    </main>
  );
};

const ThreadAutoUpdateHarness = () => (
  <I18nextProvider i18n={i18n}>
    <Harness />
  </I18nextProvider>
);

export default ThreadAutoUpdateHarness;
