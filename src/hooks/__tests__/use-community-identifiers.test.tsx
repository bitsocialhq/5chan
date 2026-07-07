import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCommunityIdentifier, useCommunityIdentifiers } from '../use-community-identifiers';
import { TRASH_BOARD_ADDRESS, TRASH_BOARD_PUBLIC_KEY } from '../../lib/special-boards';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

type TestDirectoryCommunity = {
  address: string;
  name?: string;
  publicKey?: string;
  directoryCode?: string;
  title?: string;
};

const testState = vi.hoisted(() => ({
  address: undefined as string | undefined,
  addresses: [] as Array<string | undefined>,
  directories: [] as TestDirectoryCommunity[],
}));

vi.mock('../use-directories', () => ({
  useDirectories: () => testState.directories,
  findDirectoryByAddress: (directories: TestDirectoryCommunity[], address: string | undefined) =>
    address
      ? directories.find((directory) =>
          [directory.address, directory.name, directory.publicKey, directory.directoryCode, directory.title].some((identifier) => identifier === address),
        )
      : undefined,
}));

let latestIdentifier: ReturnType<typeof useCommunityIdentifier>;
let latestIdentifiers: ReturnType<typeof useCommunityIdentifiers>;
let container: HTMLDivElement;
let root: Root;

const SingleHarness = () => {
  latestIdentifier = useCommunityIdentifier(testState.address);
  return null;
};

const MultiHarness = () => {
  latestIdentifiers = useCommunityIdentifiers(testState.addresses);
  return null;
};

const renderHarness = async (element: React.ReactElement) => {
  await act(async () => {
    root.render(element);
  });
};

describe('useCommunityIdentifier', () => {
  beforeEach(() => {
    testState.address = undefined;
    testState.addresses = [];
    testState.directories = [];
    latestIdentifier = undefined;
    latestIdentifiers = [];
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('uses vendored directory public keys before the main directory list has hydrated', async () => {
    testState.address = 'animals-and-nature.bso';

    await renderHarness(createElement(SingleHarness));

    expect(latestIdentifier).toEqual({
      name: 'animals-and-nature.bso',
      publicKey: '12D3KooWSpKszPM2c17KBgbnoRrkWPCHJosGGFg3bKnzarYhHeSc',
    });
  });

  it('uses candidate public keys for non-primary boards in a directory list', async () => {
    testState.address = 'bizraelis.bso';
    testState.directories = [
      {
        address: 'business-and-finance.bso',
        directoryCode: 'biz',
        publicKey: '12D3KooWNMybS8JqELi38ZBX897PrjWbCrGoMKfw3bgoqzC2n1Dh',
        title: '/biz/ - Business & Finance',
      },
    ];

    await renderHarness(createElement(SingleHarness));

    expect(latestIdentifier).toEqual({
      name: 'bizraelis.bso',
      publicKey: '12D3KooWR7nTdKZqZ1twGWMfVsXYDGp1XAKUrnYznKP651jFrizE',
    });
  });

  it('keeps hidden special board routes on the canonical BSO identity', async () => {
    testState.address = TRASH_BOARD_ADDRESS;
    testState.directories = [
      {
        address: 'off-topic.eth',
        directoryCode: 'trash',
        publicKey: 'stale-directory-key',
        title: '/trash/ - Off-topic',
      },
    ];

    await renderHarness(createElement(SingleHarness));

    expect(latestIdentifier).toEqual({
      name: TRASH_BOARD_ADDRESS,
      publicKey: TRASH_BOARD_PUBLIC_KEY,
    });
  });

  it('canonicalizes hidden special board aliases before loading communities', async () => {
    testState.address = 'off-topic.eth';

    await renderHarness(createElement(SingleHarness));

    expect(latestIdentifier).toEqual({
      name: TRASH_BOARD_ADDRESS,
      publicKey: TRASH_BOARD_PUBLIC_KEY,
    });
  });

  it('keeps unlisted domain routes as direct community names', async () => {
    testState.address = 'unlisted-board.bso';

    await renderHarness(createElement(SingleHarness));

    expect(latestIdentifier).toEqual({ name: 'unlisted-board.bso' });
  });

  it('keeps raw IPNS route identifiers as public keys', async () => {
    testState.address = '12D3KooWExamplePublicKey';

    await renderHarness(createElement(SingleHarness));

    expect(latestIdentifier).toEqual({ publicKey: '12D3KooWExamplePublicKey' });
  });

  it('applies the same resolution to feed community arrays', async () => {
    testState.addresses = ['bizraelis.bso', 'unlisted-board.bso', undefined, '12D3KooWExamplePublicKey'];

    await renderHarness(createElement(MultiHarness));

    expect(latestIdentifiers).toEqual([
      {
        name: 'bizraelis.bso',
        publicKey: '12D3KooWR7nTdKZqZ1twGWMfVsXYDGp1XAKUrnYznKP651jFrizE',
      },
      { name: 'unlisted-board.bso' },
      { publicKey: '12D3KooWExamplePublicKey' },
    ]);
  });
});
