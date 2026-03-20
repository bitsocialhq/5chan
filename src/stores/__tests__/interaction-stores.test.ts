import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useChallengesStore from '../use-challenges-store';
import useCreateBoardModalStore from '../use-create-board-modal-store';
import useDirectoryModalStore from '../use-directory-modal-store';
import useDisclaimerModalStore, { DISCLAIMER_ACCEPTED_KEY } from '../use-disclaimer-modal-store';
import useFeedResetStore from '../use-feed-reset-store';
import usePostNumberStore from '../use-post-number-store';
import useReplyModalStore from '../use-reply-modal-store';
import useSelectedTextStore from '../use-selected-text-store';
import useSortingStore from '../use-sorting-store';
import useThreadLiveUpdatesStore from '../use-thread-live-updates-store';

const resetReplyModalStore = () => {
  useReplyModalStore.setState({
    showReplyModal: false,
    openEmpty: false,
    activeCid: null,
    parentNumber: null,
    threadNumber: null,
    threadCid: null,
    subplebbitAddress: null,
    scrollY: 0,
    quoteInsertRequestId: 0,
    quoteInsertNumber: null,
    quoteInsertSelectedText: null,
  });
};

describe('interaction stores', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    useChallengesStore.setState({ challenges: [] });
    useCreateBoardModalStore.getState().closeCreateBoardModal();
    useDirectoryModalStore.getState().closeDirectoryModal();
    useDisclaimerModalStore.getState().closeDisclaimerModal();
    useFeedResetStore.setState({ reset: null });
    usePostNumberStore.setState({ numberToCid: {}, cidToNumber: {} });
    useSelectedTextStore.getState().resetSelectedText();
    useSortingStore.getState().setSortType('active');
    useThreadLiveUpdatesStore.getState().resetState();
    resetReplyModalStore();

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
      writable: true,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 0,
      writable: true,
    });
    vi.spyOn(document, 'getSelection').mockReturnValue({ toString: () => '' } as Selection);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
    useSelectedTextStore.getState().resetSelectedText();
    resetReplyModalStore();
  });

  it('opens and closes basic modal stores and keeps reset callbacks addressable', () => {
    expect(useCreateBoardModalStore.getState().showModal).toBe(false);
    useCreateBoardModalStore.getState().openCreateBoardModal();
    expect(useCreateBoardModalStore.getState().showModal).toBe(true);
    useCreateBoardModalStore.getState().closeCreateBoardModal();
    expect(useCreateBoardModalStore.getState().showModal).toBe(false);

    expect(useDirectoryModalStore.getState().showModal).toBe(false);
    useDirectoryModalStore.getState().openDirectoryModal();
    expect(useDirectoryModalStore.getState().showModal).toBe(true);
    useDirectoryModalStore.getState().closeDirectoryModal();
    expect(useDirectoryModalStore.getState().showModal).toBe(false);

    const resetMock = vi.fn();
    useFeedResetStore.getState().setResetFunction(resetMock);
    useFeedResetStore.getState().reset?.();
    expect(resetMock).toHaveBeenCalledTimes(1);

    expect(useSortingStore.getState().sortType).toBe('active');
    useSortingStore.getState().setSortType('replyCount');
    expect(useSortingStore.getState().sortType).toBe('replyCount');
  });

  it('tracks thread live update toggle state and queues manual refresh requests', () => {
    const store = useThreadLiveUpdatesStore.getState();

    expect(store.enabled).toBe(false);
    expect(store.isUpdating).toBe(false);
    expect(store.updateRequestId).toBe(0);
    expect(store.repliesResetRequestId).toBe(0);

    store.setEnabled(true);
    expect(useThreadLiveUpdatesStore.getState().enabled).toBe(true);

    store.toggleEnabled();
    expect(useThreadLiveUpdatesStore.getState().enabled).toBe(false);

    store.requestUpdate();
    expect(useThreadLiveUpdatesStore.getState().updateRequestId).toBe(1);

    store.startUpdate();
    expect(useThreadLiveUpdatesStore.getState().isUpdating).toBe(true);

    store.finishUpdate(1);
    expect(useThreadLiveUpdatesStore.getState()).toMatchObject({
      isUpdating: false,
      repliesResetRequestId: 1,
    });

    store.requestUpdate();
    expect(useThreadLiveUpdatesStore.getState().updateRequestId).toBe(2);

    store.startUpdate();
    store.finishUpdate(2, false);
    expect(useThreadLiveUpdatesStore.getState()).toMatchObject({
      isUpdating: false,
      repliesResetRequestId: 1,
    });

    store.requestUpdate();
    store.startUpdate();
    store.requestUpdate();
    store.startUpdate();
    store.finishUpdate(3);
    expect(useThreadLiveUpdatesStore.getState()).toMatchObject({
      isUpdating: true,
      repliesResetRequestId: 3,
      updateRequestId: 4,
    });

    store.finishUpdate(4);
    expect(useThreadLiveUpdatesStore.getState()).toMatchObject({
      isUpdating: false,
      repliesResetRequestId: 4,
      updateRequestId: 4,
    });
  });

  it('queues challenges, abandons the current one, and logs abandon failures', async () => {
    const abandonMock = vi.fn().mockResolvedValue(undefined);
    const failingAbandonMock = vi.fn().mockRejectedValue(new Error('stop failed'));

    useChallengesStore.getState().addChallenge({ type: 'captcha' } as never, abandonMock);
    useChallengesStore.getState().addChallenge({ type: 'math' } as never, failingAbandonMock);

    const [first, second] = useChallengesStore.getState().challenges;
    expect(first.challenge).toEqual({ type: 'captcha' });
    expect(second.challenge).toEqual({ type: 'math' });
    expect(first.id).not.toBe(second.id);

    await useChallengesStore.getState().abandonCurrentChallenge();
    expect(abandonMock).toHaveBeenCalledTimes(1);
    expect(useChallengesStore.getState().challenges).toHaveLength(1);

    await useChallengesStore.getState().abandonCurrentChallenge();
    expect(failingAbandonMock).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to abandon challenge publication:', expect.any(Error));
    expect(useChallengesStore.getState().challenges).toHaveLength(0);

    useChallengesStore.getState().addChallenge({ type: 'again' } as never);
    useChallengesStore.getState().removeChallenge();
    expect(useChallengesStore.getState().challenges).toEqual([]);
  });

  it('shows the disclaimer modal until accepted, then navigates directly on later opens', () => {
    const navigate = vi.fn();

    useDisclaimerModalStore.getState().showDisclaimerModal('board.eth', navigate, 'biz');

    expect(useDisclaimerModalStore.getState()).toMatchObject({
      showModal: true,
      targetAddress: 'board.eth',
      targetBoardPath: 'biz',
    });
    expect(navigate).not.toHaveBeenCalled();

    useDisclaimerModalStore.getState().acceptDisclaimer(navigate);
    expect(localStorage.getItem(DISCLAIMER_ACCEPTED_KEY)).toBe('true');
    expect(navigate).toHaveBeenCalledWith('/biz');
    expect(useDisclaimerModalStore.getState().showModal).toBe(false);

    navigate.mockClear();
    useDisclaimerModalStore.getState().showDisclaimerModal('music-posting.eth', navigate);
    expect(useDisclaimerModalStore.getState().showModal).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/music-posting.eth');
  });

  it('still navigates when saving disclaimer acceptance fails', () => {
    const navigate = vi.fn();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage is locked');
    });

    useDisclaimerModalStore.getState().showDisclaimerModal('board.eth', navigate, 'board-path');
    useDisclaimerModalStore.getState().acceptDisclaimer(navigate);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save disclaimer acceptance to localStorage:', expect.any(Error));
    expect(navigate).toHaveBeenCalledWith('/board-path');
    expect(useDisclaimerModalStore.getState().showModal).toBe(false);

    setItemSpy.mockRestore();
  });

  it('registers post numbers per board and ignores unchanged or invalid comments', () => {
    const comments = [
      { cid: 'cid-1', number: 1, subplebbitAddress: 'music.eth' },
      { cid: 'cid-2', number: 2, subplebbitAddress: 'music.eth' },
      { cid: 'cid-1-tech', number: 1, subplebbitAddress: 'tech.eth' },
      { cid: '', number: 3, subplebbitAddress: 'music.eth' },
      { cid: 'cid-no-number', subplebbitAddress: 'music.eth' },
    ] as never[];

    usePostNumberStore.getState().registerComments(comments);

    const firstState = usePostNumberStore.getState();
    expect(firstState.numberToCid).toEqual({
      'music.eth': { 1: 'cid-1', 2: 'cid-2' },
      'tech.eth': { 1: 'cid-1-tech' },
    });
    expect(firstState.cidToNumber).toEqual({
      'cid-1': 1,
      'cid-2': 2,
      'cid-1-tech': 1,
    });

    const numberToCidRef = firstState.numberToCid;
    usePostNumberStore.getState().registerComments(comments);
    expect(usePostNumberStore.getState().numberToCid).toBe(numberToCidRef);
  });

  it('opens reply modals with quoted selection and mobile scroll state', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 600,
      writable: true,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 140,
      writable: true,
    });
    vi.spyOn(document, 'getSelection').mockReturnValue({ toString: () => 'alpha\nbeta\n' } as Selection);

    useReplyModalStore.getState().openReplyModal('parent-cid', 12, 'thread-cid', 34, 'music.eth');

    expect(useSelectedTextStore.getState().selectedText).toBe('>alpha\n>beta\n');
    expect(useReplyModalStore.getState()).toMatchObject({
      showReplyModal: true,
      openEmpty: false,
      activeCid: 'thread-cid',
      parentNumber: 12,
      threadNumber: 34,
      threadCid: 'thread-cid',
      subplebbitAddress: 'music.eth',
      scrollY: 140,
    });
  });

  it('inserts quote requests into an already-open reply modal and can reopen empty', () => {
    useReplyModalStore.getState().openReplyModal('parent-cid', 12, 'thread-cid', 34, 'music.eth');
    vi.spyOn(document, 'getSelection').mockReturnValue({ toString: () => 'quoted text' } as Selection);

    useReplyModalStore.getState().openReplyModal('parent-cid-2', 77, 'thread-cid', 34, 'music.eth');

    expect(useReplyModalStore.getState().quoteInsertRequestId).toBe(1);
    expect(useReplyModalStore.getState().quoteInsertNumber).toBe(77);
    expect(useReplyModalStore.getState().quoteInsertSelectedText).toBe('>quoted text');

    useSelectedTextStore.getState().setSelectedText('stale quote');
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 500,
      writable: true,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 32,
      writable: true,
    });

    useReplyModalStore.getState().openReplyModalEmpty('thread-cid', 34, 'music.eth');

    expect(useSelectedTextStore.getState().selectedText).toBe('');
    expect(useReplyModalStore.getState()).toMatchObject({
      showReplyModal: true,
      openEmpty: true,
      activeCid: 'thread-cid',
      threadNumber: 34,
      threadCid: 'thread-cid',
      subplebbitAddress: 'music.eth',
      scrollY: 32,
      quoteInsertNumber: null,
      quoteInsertSelectedText: null,
    });

    useSelectedTextStore.getState().setSelectedText('cleanup');
    useReplyModalStore.getState().closeModal();
    expect(useSelectedTextStore.getState().selectedText).toBe('');
    expect(useReplyModalStore.getState()).toMatchObject({
      showReplyModal: false,
      openEmpty: false,
      activeCid: null,
      parentNumber: null,
      threadNumber: null,
      quoteInsertNumber: null,
      quoteInsertSelectedText: null,
    });
  });
});
