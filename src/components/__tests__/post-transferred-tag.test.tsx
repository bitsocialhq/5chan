import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TRASH_BOARD_ADDRESS } from '../../lib/special-boards';
import PostTransferredTag from '../post-transferred-tag';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'transferred' ? 'Transferred' : key),
  }),
}));

describe('PostTransferredTag', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders the transferred label for moderation-written transfer markers', async () => {
    await act(async () => {
      root.render(createElement(PostTransferredTag, { comment: { commentModeration: { flairs: [{ text: '5chan:transferred' }] } } }));
    });

    expect(container.textContent).toBe('[Transferred] ');
  });

  it('does not render the transferred label for posts moved to trash', async () => {
    await act(async () => {
      root.render(
        createElement(PostTransferredTag, {
          comment: {
            commentModeration: { flairs: [{ text: '5chan:transferred' }] },
            communityAddress: TRASH_BOARD_ADDRESS,
            title: 'Original title',
          },
        }),
      );
    });

    expect(container.textContent).toBe('');
  });

  it('ignores user-authored transferred-looking flairs', async () => {
    await act(async () => {
      root.render(createElement(PostTransferredTag, { comment: { flairs: [{ text: '5chan:transferred' }] } }));
    });

    expect(container.textContent).toBe('');
  });
});
