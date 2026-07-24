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
};

type PostFormDraftsState = {
  forms: Record<string, PostFormState>;
  clearForm: (locationKey: string) => void;
  openForm: (locationKey: string) => void;
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
  updateDraft: (locationKey, draft) =>
    set((state) => {
      const current = state.forms[locationKey] ?? EMPTY_POST_FORM_STATE;
      return {
        forms: {
          ...state.forms,
          [locationKey]: {
            ...current,
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
