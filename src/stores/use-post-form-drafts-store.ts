import { create } from 'zustand';

export type PostFormDraft = {
  communityAddress?: string;
  content: string;
  flag?: string;
  flashTag: string;
  link: string;
  options: string;
  spoiler: boolean;
  title: string;
};

type PostFormState = {
  draft: PostFormDraft;
  isOpen: boolean;
  submissionError?: string;
};

type PostFormDraftsState = {
  forms: Record<string, PostFormState>;
  clearForm: (locationKey: string) => void;
  clearSubmissionError: (locationKey: string) => void;
  closeForm: (locationKey: string) => void;
  openForm: (locationKey: string) => void;
  showSubmissionError: (locationKey: string, error: string) => void;
  updateDraft: (locationKey: string, draft: Partial<PostFormDraft>) => void;
};

const EMPTY_DRAFT: PostFormDraft = {
  content: '',
  flashTag: '',
  link: '',
  options: '',
  spoiler: false,
  title: '',
};

export const EMPTY_POST_FORM_STATE: PostFormState = {
  draft: EMPTY_DRAFT,
  isOpen: false,
};

const usePostFormDraftsStore = create<PostFormDraftsState>((set) => ({
  forms: {},
  clearForm: (locationKey) =>
    set((state) => {
      const { [locationKey]: _clearedForm, ...forms } = state.forms;
      return { forms };
    }),
  clearSubmissionError: (locationKey) =>
    set((state) => {
      const current = state.forms[locationKey];
      if (!current?.submissionError) return state;
      return {
        forms: {
          ...state.forms,
          [locationKey]: {
            ...current,
            submissionError: undefined,
          },
        },
      };
    }),
  closeForm: (locationKey) =>
    set((state) => {
      const current = state.forms[locationKey];
      if (!current) return state;
      return {
        forms: {
          ...state.forms,
          [locationKey]: {
            ...current,
            isOpen: false,
          },
        },
      };
    }),
  openForm: (locationKey) =>
    set((state) => ({
      forms: {
        ...state.forms,
        [locationKey]: {
          ...(state.forms[locationKey] ?? EMPTY_POST_FORM_STATE),
          isOpen: true,
        },
      },
    })),
  showSubmissionError: (locationKey, submissionError) =>
    set((state) => ({
      forms: {
        ...state.forms,
        [locationKey]: {
          ...(state.forms[locationKey] ?? EMPTY_POST_FORM_STATE),
          isOpen: true,
          submissionError,
        },
      },
    })),
  updateDraft: (locationKey, draft) =>
    set((state) => {
      const current = state.forms[locationKey] ?? EMPTY_POST_FORM_STATE;
      return {
        forms: {
          ...state.forms,
          [locationKey]: {
            ...current,
            submissionError: undefined,
            draft: {
              ...current.draft,
              ...draft,
            },
          },
        },
      };
    }),
}));

export default usePostFormDraftsStore;
