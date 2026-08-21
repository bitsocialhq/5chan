import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import vendoredManifestSource from '../../data/5chan-directory-criteria.jsonc?raw';
import {
  __resetDirectoryVoteCriteriaForTests,
  DIRECTORY_VOTE_CRITERIA_URL,
  getCachedDirectoryVoteCriteria,
  getDirectoryCodeFromContestId,
  getVendoredDirectoryVoteCriteria,
  loadDirectoryVoteCriteria,
  parseDirectoryVoteCriteria,
  subscribeDirectoryVoteCriteria,
} from '../directory-vote-criteria';

const withUpdatedRandomContest = (suffix: number) =>
  vendoredManifestSource.replace('"contestId": "5chan-dir-b-vote-test-1"', `"contestId": "5chan-dir-b-vote-test-${suffix}"`);

describe('directory-vote-criteria', () => {
  beforeEach(() => {
    __resetDirectoryVoteCriteriaForTests();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('derives and indexes all 64 vendored directory contests', () => {
    const manifest = getVendoredDirectoryVoteCriteria();

    expect(manifest.criteria).toHaveLength(64);
    expect(manifest.criteriaByDirectoryCode.size).toBe(64);
    expect(manifest.directoryCodeByContestId.size).toBe(64);
    expect(manifest.criteriaByDirectoryCode.get('b')?.contestId).toBe('5chan-dir-b-vote-test-1');
    expect(manifest.criteriaByDirectoryCode.get('r')?.contestId).toBe('5chan-dir-r-vote-test-1');
    expect(manifest.criteriaByDirectoryCode.has('trash')).toBe(false);
  });

  it('parses JSONC and maps contest ids in both directions', () => {
    const manifest = parseDirectoryVoteCriteria(`// downloaded from the canonical lists repository\n${vendoredManifestSource}`);

    expect(getDirectoryCodeFromContestId('5chan-dir-g-vote-test-12')).toBe('g');
    expect(getDirectoryCodeFromContestId('not-a-directory-contest')).toBeUndefined();
    expect(manifest.directoryCodeByContestId.get('5chan-dir-g-vote-test-1')).toBe('g');
    expect(manifest.criteriaByDirectoryCode.get('g')?.contestId).toBe('5chan-dir-g-vote-test-1');
  });

  it('rejects a contest id that does not encode a directory code', () => {
    const source = vendoredManifestSource.replace('"contestId": "5chan-dir-b-vote-test-1"', '"contestId": "random-board-vote"');

    expect(() => parseDirectoryVoteCriteria(source)).toThrow('does not encode a directory code');
  });

  it('rejects two contests that map to the same directory code', () => {
    const manifest = JSON.parse(vendoredManifestSource);
    const randomContest = manifest.contests.find((contest: { contestId: string }) => contest.contestId === '5chan-dir-b-vote-test-1');
    manifest.contests.push({ ...randomContest, contestId: '5chan-dir-b-vote-test-2' });

    expect(() => parseDirectoryVoteCriteria(JSON.stringify(manifest))).toThrow('more than one contest for /b/');
  });

  it('fetches, validates, and caches the canonical runtime manifest', async () => {
    const remoteSource = withUpdatedRandomContest(2);
    const fetchMock = vi.fn().mockResolvedValue(new Response(remoteSource, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const remote = await loadDirectoryVoteCriteria();

    expect(fetchMock).toHaveBeenCalledWith(DIRECTORY_VOTE_CRITERIA_URL, expect.objectContaining({ cache: 'no-cache', signal: expect.any(AbortSignal) }));
    expect(remote.criteriaByDirectoryCode.get('b')?.contestId).toBe('5chan-dir-b-vote-test-2');

    expect(await loadDirectoryVoteCriteria()).toBe(remote);
    expect(fetchMock).toHaveBeenCalledOnce();

    __resetDirectoryVoteCriteriaForTests();
    fetchMock.mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const cached = await loadDirectoryVoteCriteria();
    expect(cached.criteriaByDirectoryCode.get('b')?.contestId).toBe('5chan-dir-b-vote-test-2');
  });

  it('notifies subscribers only when runtime criteria change', async () => {
    getCachedDirectoryVoteCriteria();
    const listener = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(new Response(vendoredManifestSource, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const unsubscribe = subscribeDirectoryVoteCriteria(listener);
    await loadDirectoryVoteCriteria();

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();

    __resetDirectoryVoteCriteriaForTests();
    localStorage.clear();
    getCachedDirectoryVoteCriteria();
    fetchMock.mockResolvedValue(new Response(withUpdatedRandomContest(2), { status: 200 }));
    const changedListener = vi.fn();
    const unsubscribeChanged = subscribeDirectoryVoteCriteria(changedListener);
    await loadDirectoryVoteCriteria();

    expect(changedListener).toHaveBeenCalledOnce();
    unsubscribeChanged();
  });

  it('falls back to the vendored manifest when the network and cache are unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const manifest = await loadDirectoryVoteCriteria();

    expect(manifest.criteria).toHaveLength(64);
    expect(manifest.criteriaByDirectoryCode.get('b')?.contestId).toBe('5chan-dir-b-vote-test-1');
    expect(getCachedDirectoryVoteCriteria()).toBe(manifest);
  });
});
