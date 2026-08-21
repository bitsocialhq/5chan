import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contest, ContestTally, Criteria, PubsubVoter } from '@bitsocial/pubsub-voting';
import { getVendoredDirectoryVoteCriteria } from '../../lib/directory-vote-criteria';
import { useVoteTally } from '../use-vote-tally';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  criteria: undefined as Criteria | undefined,
  voterState: { state: 'unavailable' } as ReturnType<typeof import('../use-pubsub-voter').usePubsubVoter>,
}));

vi.mock('../use-directory-vote-criteria', () => ({
  useDirectoryVoteCriteria: () => testState.criteria,
}));

vi.mock('../use-pubsub-voter', () => ({
  usePubsubVoter: () => testState.voterState,
}));

interface ContestHarness {
  contest: Contest;
  emitError: (error: unknown) => void;
  emitUpdate: () => void;
  setTally: (tally: ContestTally) => void;
  stop: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
}

const createContestHarness = (criteria: Criteria, initialTally?: ContestTally, updateError?: Error): ContestHarness => {
  let tally = initialTally;
  const updateListeners: Array<() => void> = [];
  const errorListeners: Array<(error: unknown) => void> = [];
  const stop = vi.fn(async () => undefined);
  const update = vi.fn(async () => {
    if (updateError) throw updateError;
    for (const listener of updateListeners) listener();
  });
  const on = vi.fn((event: 'update' | 'error', callback: (() => void) | ((error: unknown) => void)) => {
    if (event === 'update') updateListeners.push(callback as () => void);
    else errorListeners.push(callback as (error: unknown) => void);
  });
  const contest = {
    criteria,
    topic: `bitsocial-votes/${criteria.contestId}`,
    get tally() {
      return tally;
    },
    update,
    stop,
    on,
  } as unknown as Contest;

  return {
    contest,
    emitError: (error) => {
      for (const listener of errorListeners) listener(error);
    },
    emitUpdate: () => {
      for (const listener of updateListeners) listener();
    },
    setTally: (nextTally) => {
      tally = nextTally;
    },
    stop,
    update,
    on,
  };
};

const createVoter = (contest: Contest) =>
  ({
    createContest: vi.fn(async () => contest),
  }) as unknown as PubsubVoter;

const TestComponent = ({ directoryCode = 'b' }: { directoryCode?: string }) => {
  const result = useVoteTally(directoryCode);
  const first = result.state === 'ready' ? result.tally.ranking[0] : undefined;
  return createElement('output', {
    'data-chain-verified': first?.chainVerified,
    'data-error': result.error?.message,
    'data-name-resolved': first?.nameResolved,
    'data-reason': result.state === 'unavailable' ? result.reason : undefined,
    'data-state': result.state,
    'data-weight': first?.weight.toString(),
  });
};

const flush = async () => {
  await act(async () => {
    for (let index = 0; index < 6; index += 1) await Promise.resolve();
  });
};

let container: HTMLDivElement;
let root: Root;

const renderHook = async () => {
  await act(async () => {
    root.render(createElement(TestComponent));
  });
  await flush();
};

describe('useVoteTally', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.criteria = getVendoredDirectoryVoteCriteria().criteriaByDirectoryCode.get('b');
    testState.voterState = { state: 'unavailable' };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    await flush();
    container.remove();
  });

  it('joins one contest and exposes its provisional verification flags', async () => {
    const tally: ContestTally = {
      contestId: testState.criteria!.contestId,
      ranking: [{ community: { name: 'board.bso', publicKey: '12D3KooWboard' }, weight: BigInt(3), chainVerified: false, nameResolved: false }],
    };
    const harness = createContestHarness(testState.criteria!, tally);
    const voter = createVoter(harness.contest);
    testState.voterState = { state: 'ready', voter };

    await renderHook();

    expect(voter.createContest).toHaveBeenCalledOnce();
    expect(voter.createContest).toHaveBeenCalledWith({ criteria: testState.criteria });
    expect(harness.update).toHaveBeenCalledOnce();
    expect(container.querySelector('output')).toMatchObject({
      dataset: expect.objectContaining({ state: 'ready', weight: '3', chainVerified: 'false', nameResolved: 'false' }),
    });

    harness.setTally({
      contestId: testState.criteria!.contestId,
      ranking: [{ community: { name: 'board.bso', publicKey: '12D3KooWboard' }, weight: BigInt(4), chainVerified: true, nameResolved: true }],
    });
    await act(async () => harness.emitUpdate());

    expect(container.querySelector('output')).toMatchObject({
      dataset: expect.objectContaining({ state: 'ready', weight: '4', chainVerified: 'true', nameResolved: 'true' }),
    });
  });

  it('reports directories without a published contest as unavailable', async () => {
    testState.criteria = undefined;
    const createContest = vi.fn();
    testState.voterState = { state: 'ready', voter: { createContest } as unknown as PubsubVoter };

    await renderHook();

    expect(container.querySelector('output')?.dataset).toMatchObject({ state: 'unavailable', reason: 'no-contest' });
    expect(createContest).not.toHaveBeenCalled();
  });

  it('reports gateway mode without a browser voter as unavailable', async () => {
    await renderHook();

    expect(container.querySelector('output')?.dataset).toMatchObject({ state: 'unavailable', reason: 'no-voter' });
  });

  it('keeps the last tally while surfacing a contest error', async () => {
    const tally: ContestTally = { contestId: testState.criteria!.contestId, ranking: [] };
    const harness = createContestHarness(testState.criteria!, tally);
    testState.voterState = { state: 'ready', voter: createVoter(harness.contest) };
    await renderHook();

    await act(async () => harness.emitError(new Error('RPC unavailable')));

    expect(container.querySelector('output')?.dataset).toMatchObject({ state: 'ready', error: 'RPC unavailable' });
  });

  it('surfaces an initial contest update failure', async () => {
    const harness = createContestHarness(testState.criteria!, undefined, new Error('join failed'));
    testState.voterState = { state: 'ready', voter: createVoter(harness.contest) };

    await renderHook();

    expect(container.querySelector('output')?.dataset).toMatchObject({ state: 'failed', error: 'join failed' });
  });

  it('keeps a restored tally when the initial refresh reports a transient error', async () => {
    const tally: ContestTally = { contestId: testState.criteria!.contestId, ranking: [] };
    const harness = createContestHarness(testState.criteria!, tally, new Error('refresh failed'));
    testState.voterState = { state: 'ready', voter: createVoter(harness.contest) };

    await renderHook();

    expect(container.querySelector('output')?.dataset).toMatchObject({ state: 'ready', error: 'refresh failed' });
  });

  it('reuses one contest adapter without accumulating library callbacks across remounts', async () => {
    const tally: ContestTally = { contestId: testState.criteria!.contestId, ranking: [] };
    const harness = createContestHarness(testState.criteria!, tally);
    const voter = createVoter(harness.contest);
    testState.voterState = { state: 'ready', voter };
    await renderHook();

    await act(async () => root.unmount());
    await flush();
    root = createRoot(container);
    await renderHook();

    expect(voter.createContest).toHaveBeenCalledOnce();
    expect(harness.on).toHaveBeenCalledTimes(2);
    expect(harness.update).toHaveBeenCalledTimes(2);
    expect(harness.stop).toHaveBeenCalledOnce();
  });
});
