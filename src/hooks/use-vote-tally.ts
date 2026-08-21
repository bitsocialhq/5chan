import { useSyncExternalStore } from 'react';
import type { Contest, ContestTally, Criteria, PubsubVoter } from '@bitsocial/pubsub-voting';
import { useDirectoryVoteCriteria } from './use-directory-vote-criteria';
import { usePubsubVoter } from './use-pubsub-voter';

type VoteTallySnapshot =
  | { state: 'idle' }
  | { state: 'joining' }
  | { state: 'ready'; contest: Contest; tally: ContestTally; error?: Error }
  | { state: 'failed'; contest?: Contest; error: Error };

export type VoteTallyState =
  | { state: 'unavailable'; reason: 'no-contest' | 'no-voter'; criteria?: undefined; contest?: undefined; tally?: undefined; error?: undefined }
  | { state: 'joining'; criteria: Criteria; contest?: undefined; tally?: undefined; error?: undefined }
  | { state: 'ready'; criteria: Criteria; contest: Contest; tally: ContestTally; error?: Error }
  | { state: 'failed'; criteria: Criteria; contest?: Contest; tally?: undefined; error: Error };

const IDLE_SNAPSHOT: VoteTallySnapshot = { state: 'idle' };
const getIdleSnapshot = () => IDLE_SNAPSHOT;
const subscribeIdle = () => () => {};
const asError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

class VoteTallyEntry {
  readonly #criteria: Criteria;
  readonly #listeners = new Set<() => void>();
  readonly #voter: PubsubVoter;
  #contest: Contest | undefined;
  #contestPromise: Promise<Contest> | undefined;
  #desiredActive = false;
  #listenersAttached = false;
  #operation = Promise.resolve();
  #snapshot: VoteTallySnapshot = IDLE_SNAPSHOT;

  constructor(voter: PubsubVoter, criteria: Criteria) {
    this.#voter = voter;
    this.#criteria = criteria;
  }

  getSnapshot = (): VoteTallySnapshot => this.#snapshot;

  subscribe = (listener: () => void) => {
    const shouldStart = this.#listeners.size === 0;
    this.#listeners.add(listener);
    if (shouldStart) {
      this.#desiredActive = true;
      this.#setSnapshot({ state: 'joining' });
      this.#queueStart();
    }

    return () => {
      this.#listeners.delete(listener);
      if (this.#listeners.size > 0) return;

      this.#desiredActive = false;
      this.#snapshot = IDLE_SNAPSHOT;
      this.#queueStop();
    };
  };

  #setSnapshot(snapshot: VoteTallySnapshot) {
    this.#snapshot = snapshot;
    for (const listener of this.#listeners) listener();
  }

  #attachContestListeners(contest: Contest) {
    if (this.#listenersAttached) return;
    this.#listenersAttached = true;

    contest.on('update', () => {
      if (!this.#desiredActive || !contest.tally) return;
      this.#setSnapshot({ state: 'ready', contest, tally: contest.tally });
    });
    contest.on('error', (error) => {
      if (!this.#desiredActive) return;
      const normalizedError = asError(error);
      if (contest.tally) {
        this.#setSnapshot({ state: 'ready', contest, tally: contest.tally, error: normalizedError });
      } else {
        this.#setSnapshot({ state: 'failed', contest, error: normalizedError });
      }
    });
  }

  #queueStart() {
    this.#operation = this.#operation.then(async () => {
      if (!this.#desiredActive) return;

      try {
        this.#contestPromise ??= this.#voter.createContest({ criteria: this.#criteria });
        const contest = await this.#contestPromise;
        this.#contest = contest;
        this.#attachContestListeners(contest);
        if (!this.#desiredActive) return;

        await contest.update();
        if (!this.#desiredActive) return;
        if (!contest.tally) throw new Error(`Contest '${this.#criteria.contestId}' updated without a tally`);
        this.#setSnapshot({ state: 'ready', contest, tally: contest.tally });
      } catch (error) {
        if (!this.#contest) this.#contestPromise = undefined;
        if (!this.#desiredActive) return;

        const normalizedError = asError(error);
        if (this.#contest?.tally) {
          this.#setSnapshot({ state: 'ready', contest: this.#contest, tally: this.#contest.tally, error: normalizedError });
        } else {
          this.#setSnapshot({ state: 'failed', contest: this.#contest, error: normalizedError });
        }
      }
    });
  }

  #queueStop() {
    this.#operation = this.#operation.then(async () => {
      if (this.#desiredActive || !this.#contest) return;
      try {
        await this.#contest.stop();
      } catch (error) {
        console.error(`Failed to stop vote tally for '${this.#criteria.contestId}'`, error);
      }
    });
  }
}

const entriesByVoter = new WeakMap<PubsubVoter, WeakMap<Criteria, VoteTallyEntry>>();

const getVoteTallyEntry = (voter: PubsubVoter, criteria: Criteria): VoteTallyEntry => {
  let entriesByCriteria = entriesByVoter.get(voter);
  if (!entriesByCriteria) {
    entriesByCriteria = new WeakMap();
    entriesByVoter.set(voter, entriesByCriteria);
  }

  let entry = entriesByCriteria.get(criteria);
  if (!entry) {
    entry = new VoteTallyEntry(voter, criteria);
    entriesByCriteria.set(criteria, entry);
  }
  return entry;
};

export const useVoteTally = (directoryCode: string | undefined): VoteTallyState => {
  const voterState = usePubsubVoter();
  const criteria = useDirectoryVoteCriteria(directoryCode);
  const entry = voterState.state === 'ready' && criteria ? getVoteTallyEntry(voterState.voter, criteria) : undefined;
  const snapshot = useSyncExternalStore(entry?.subscribe ?? subscribeIdle, entry?.getSnapshot ?? getIdleSnapshot, getIdleSnapshot);

  if (!criteria) return { state: 'unavailable', reason: 'no-contest' };
  if (voterState.state === 'unavailable') return { state: 'unavailable', reason: 'no-voter' };
  if (voterState.state === 'failed') return { state: 'failed', criteria, error: voterState.error };
  if (!entry || snapshot.state === 'idle' || snapshot.state === 'joining') return { state: 'joining', criteria };
  if (snapshot.state === 'failed') return { state: 'failed', criteria, contest: snapshot.contest, error: snapshot.error };
  return { state: 'ready', criteria, contest: snapshot.contest, tally: snapshot.tally, error: snapshot.error };
};
