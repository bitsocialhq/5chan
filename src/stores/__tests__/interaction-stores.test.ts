import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useChallengesStore from '../use-challenges-store';
import useCreateBoardModalStore from '../use-create-board-modal-store';
import useDirectoryModalStore from '../use-directory-modal-store';
import useDisclaimerModalStore, { DISCLAIMER_ACCEPTED_KEY } from '../use-disclaimer-modal-store';
import useFeedResetStore from '../use-feed-reset-store';
import usePostNumberStore, { getCidForPostNumber, getScopedNumberToCidMap } from '../use-post-number-store';
import useReplyModalStore from '../use-reply-modal-store';
import useSelectedTextStore from '../use-selected-text-store';
import useSortingStore from '../use-sorting-store';
import useThreadLiveUpdatesStore from '../use-thread-live-updates-store';

const resetReplyModalStore = () => {
  useReplyModalStore.setState({
    modals: {},
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
    useFeedResetStore.setState({ currentResetFunction: null, reset: null });
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
    const firstResetInvoker = useFeedResetStore.getState().reset;
    useFeedResetStore.getState().reset?.();
    expect(resetMock).toHaveBeenCalledTimes(1);

    const nextResetMock = vi.fn();
    useFeedResetStore.getState().setResetFunction(nextResetMock);
    expect(useFeedResetStore.getState().reset).toBe(firstResetInvoker);
    useFeedResetStore.getState().reset?.();
    expect(resetMock).toHaveBeenCalledTimes(1);
    expect(nextResetMock).toHaveBeenCalledTimes(1);

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

  it('redacts generated fortune content before storing challenge publications', async () => {
    const publishChallengeAnswers = vi.fn();
    const publication = {
      content: 'body[fortune color=#fd4d32]Excellent Luck[/fortune]',
      publishChallengeAnswers,
    };

    useChallengesStore.getState().addChallenge([{ challenges: [] }, publication] as never);

    const storedChallenge = useChallengesStore.getState().challenges[0]?.challenge as unknown[] | undefined;
    const storedPublication = storedChallenge?.[1] as typeof publication | undefined;
    expect(storedPublication?.content).toBe('body');
    expect(storedPublication?.content).not.toContain('Excellent Luck');

    await storedPublication?.publishChallengeAnswers(['4']);
    expect(publishChallengeAnswers).toHaveBeenCalledWith(['4']);
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
      { cid: 'cid-1', number: 1, communityAddress: 'music.eth' },
      { cid: 'cid-2', number: 2, communityAddress: 'music.eth' },
      { cid: 'cid-1-tech', number: 1, communityAddress: 'tech.eth' },
      { cid: '', number: 3, communityAddress: 'music.eth' },
      { cid: 'cid-no-number', communityAddress: 'music.eth' },
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

  it('merges alias-scoped post number maps when the exact board scope is only partially populated', () => {
    const numberToCid = {
      'music.eth': {
        1: 'op-cid',
        2: 'reply-cid',
      },
      'music.bso': {
        30: 'late-reply-cid',
      },
    };

    expect(getScopedNumberToCidMap(numberToCid, 'music.bso')).toEqual({
      1: 'op-cid',
      2: 'reply-cid',
      30: 'late-reply-cid',
    });
    expect(getCidForPostNumber(numberToCid, 'music.bso', 1)).toBe('op-cid');
    expect(getCidForPostNumber(numberToCid, 'music.bso', 30)).toBe('late-reply-cid');
  });

  it('opens reply modals with quoted selection and mobile scroll state', () => {
    const locationKey = '/mu/thread/thread-cid';
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

    useReplyModalStore.getState().openReplyModal(locationKey, 'parent-cid', 12, 'thread-cid', 34, 'music.eth');

    expect(useSelectedTextStore.getState().selectedText).toBe('>alpha\n>beta\n');
    expect(useReplyModalStore.getState().modals[locationKey]).toMatchObject({
      showReplyModal: true,
      openEmpty: false,
      activeCid: 'thread-cid',
      parentNumber: 12,
      threadNumber: 34,
      threadCid: 'thread-cid',
      communityAddress: 'music.eth',
      scrollY: 140,
    });
  });

  it('inserts quote requests into an already-open reply modal and can reopen empty', () => {
    const locationKey = '/mu/thread/thread-cid';
    const otherLocationKey = '/mu/thread/other-thread-cid';
    useReplyModalStore.getState().openReplyModal(locationKey, 'parent-cid', 12, 'thread-cid', 34, 'music.eth');
    vi.spyOn(document, 'getSelection').mockReturnValue({ toString: () => 'quoted text' } as Selection);

    useReplyModalStore.getState().openReplyModal(locationKey, 'parent-cid-2', 77, 'thread-cid', 34, 'music.eth');

    expect(useReplyModalStore.getState().modals[locationKey].quoteInsertRequestId).toBe(1);
    expect(useReplyModalStore.getState().modals[locationKey].quoteInsertNumber).toBe(77);
    expect(useReplyModalStore.getState().modals[locationKey].quoteInsertSelectedText).toBe('>quoted text');

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

    useReplyModalStore.getState().updateDraft(locationKey, { content: 'first route draft', link: 'https://example.com/first.png' });
    useReplyModalStore.getState().openReplyModalEmpty(otherLocationKey, 'other-thread-cid', 35, 'music.eth');

    expect(useSelectedTextStore.getState().selectedText).toBe('');
    expect(useReplyModalStore.getState().modals[otherLocationKey]).toMatchObject({
      showReplyModal: true,
      openEmpty: true,
      activeCid: 'other-thread-cid',
      threadNumber: 35,
      threadCid: 'other-thread-cid',
      communityAddress: 'music.eth',
      scrollY: 32,
      quoteInsertNumber: null,
      quoteInsertSelectedText: null,
    });
    expect(useReplyModalStore.getState().modals[otherLocationKey].draft).toEqual({
      content: '',
      link: '',
      options: '',
      spoiler: false,
    });
    expect(useReplyModalStore.getState().modals[locationKey].draft).toMatchObject({
      content: 'first route draft',
      link: 'https://example.com/first.png',
    });

    useSelectedTextStore.getState().setSelectedText('cleanup');
    useReplyModalStore.getState().closeModal(otherLocationKey);
    expect(useSelectedTextStore.getState().selectedText).toBe('');
    expect(useReplyModalStore.getState().modals[otherLocationKey]).toBeUndefined();
    expect(useReplyModalStore.getState().modals[locationKey].showReplyModal).toBe(true);
  });
});
