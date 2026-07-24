import { create } from 'zustand';
import useSelectedTextStore from './use-selected-text-store';

export type ReplyModalDraft = {
  content: string;
  flag?: string;
  link: string;
  options: string;
  spoiler: boolean;
};

export type ReplyModalLocationState = {
  showReplyModal: boolean;
  /** True when opened via "Post a Reply" footer button — textarea should be empty, no quote. */
  openEmpty: boolean;
  activeCid: string;
  parentNumber: number | null;
  threadNumber: number | null;
  threadCid: string;
  communityAddress: string;
  scrollY: number;
  quoteInsertRequestId: number;
  quoteInsertNumber: number | null;
  quoteInsertSelectedText: string | null;
  draft: ReplyModalDraft;
};

interface ReplyModalState {
  modals: Record<string, ReplyModalLocationState>;
  closeModal: (locationKey: string) => void;
  openReplyModal: (
    locationKey: string,
    parentCid: string,
    parentNumber: number | undefined,
    postCid: string,
    threadNumber: number | undefined,
    communityAddress: string,
  ) => void;
  /** Open reply modal with empty textarea, no prefilled quote. Use for "Post a Reply" footer button. */
  openReplyModalEmpty: (locationKey: string, postCid: string, threadNumber: number | undefined, communityAddress: string) => void;
  updateDraft: (locationKey: string, draft: Partial<ReplyModalDraft>) => void;
}

const getQuotedSelection = () => {
  const text = document.getSelection()?.toString();
  if (!text) return '';

  // Keep each selected line as 5chan greentext and normalize newlines.
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\n+$/g, '');

  if (!normalizedText) return '';

  return normalizedText
    .split('\n')
    .map((line) => `>${line}`)
    .join('\n');
};

const getScrollY = () => (window.innerWidth <= 768 ? window.scrollY : 0);

const EMPTY_REPLY_MODAL_DRAFT: ReplyModalDraft = {
  content: '',
  link: '',
  options: '',
  spoiler: false,
};

const useReplyModalStore = create<ReplyModalState>((set, get) => ({
  modals: {},

  closeModal: (locationKey) => {
    useSelectedTextStore.getState().resetSelectedText();
    set((state) => {
      const { [locationKey]: _closedModal, ...modals } = state.modals;
      return { modals };
    });
  },

  openReplyModal: (locationKey, parentCid, parentNumber, postCid, threadNumber, communityAddress) => {
    const quotedSelection = getQuotedSelection();
    const currentModal = get().modals[locationKey];

    // If the reply modal is already open on this location, insert this quote in its current textarea at the caret.
    if (currentModal?.showReplyModal) {
      set((state) => ({
        modals: {
          ...state.modals,
          [locationKey]: {
            ...currentModal,
            quoteInsertRequestId: currentModal.quoteInsertRequestId + 1,
            quoteInsertNumber: parentNumber ?? null,
            quoteInsertSelectedText: quotedSelection || null,
          },
        },
      }));
      return;
    }

    const selectedText = quotedSelection ? `${quotedSelection}\n` : '';
    if (selectedText) {
      useSelectedTextStore.getState().setSelectedText(selectedText);
    } else {
      useSelectedTextStore.getState().resetSelectedText();
    }

    set((state) => ({
      modals: {
        ...state.modals,
        [locationKey]: {
          showReplyModal: true,
          openEmpty: false,
          activeCid: postCid,
          parentNumber: parentNumber ?? null,
          threadNumber: threadNumber ?? null,
          threadCid: postCid,
          communityAddress,
          scrollY: getScrollY(),
          quoteInsertRequestId: 0,
          quoteInsertNumber: null,
          quoteInsertSelectedText: null,
          draft: {
            ...EMPTY_REPLY_MODAL_DRAFT,
            content: `>>${parentNumber ?? '?'}\n${selectedText}`,
          },
        },
      },
    }));
  },

  openReplyModalEmpty: (locationKey, postCid, threadNumber, communityAddress) => {
    useSelectedTextStore.getState().resetSelectedText();
    set((state) => ({
      modals: {
        ...state.modals,
        [locationKey]: {
          showReplyModal: true,
          openEmpty: true,
          activeCid: postCid,
          parentNumber: null,
          threadNumber: threadNumber ?? null,
          threadCid: postCid,
          communityAddress,
          scrollY: getScrollY(),
          quoteInsertRequestId: 0,
          quoteInsertNumber: null,
          quoteInsertSelectedText: null,
          draft: { ...EMPTY_REPLY_MODAL_DRAFT },
        },
      },
    }));
  },

  updateDraft: (locationKey, draft) =>
    set((state) => {
      const modal = state.modals[locationKey];
      if (!modal) return state;

      return {
        modals: {
          ...state.modals,
          [locationKey]: {
            ...modal,
            draft: {
              ...EMPTY_REPLY_MODAL_DRAFT,
              ...modal.draft,
              ...draft,
            },
          },
        },
      };
    }),
}));

export default useReplyModalStore;
