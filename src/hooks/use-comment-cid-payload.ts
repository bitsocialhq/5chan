import { useCallback, useSyncExternalStore } from 'react';
import { useAccount } from '@bitsocial/bitsocial-react-hooks';

type PkcWithCidFetch = {
  fetchCid: (options: { cid: string }) => Promise<unknown>;
};

type CommentCidPayloadSnapshot = {
  communityAddress?: string;
  error?: Error;
  state: 'idle' | 'fetching' | 'succeeded' | 'failed';
};

type CommentCidPayloadEntry = {
  listeners: Set<() => void>;
  request?: Promise<void>;
  snapshot: CommentCidPayloadSnapshot;
};

const IDLE_SNAPSHOT: CommentCidPayloadSnapshot = { state: 'idle' };
const entriesByClient = new WeakMap<object, Map<string, CommentCidPayloadEntry>>();

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object');

const decodeText = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (ArrayBuffer.isView(value)) return new TextDecoder().decode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  if (value instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(value));
  return undefined;
};

const getCommunityAddress = (payload: Record<string, unknown>): string | undefined => {
  for (const key of ['communityName', 'communityAddress', 'communityPublicKey']) {
    const value = payload[key];
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
};

export const decodeCommentCidCommunityAddress = (cid: string, fetchedCid: unknown): string => {
  const fetchedRecord = isRecord(fetchedCid) ? fetchedCid : undefined;
  const encodedPayload = fetchedRecord && getCommunityAddress(fetchedRecord) ? fetchedRecord : (fetchedRecord?.content ?? fetchedCid);
  const payloadText = decodeText(encodedPayload);
  const payload = payloadText ? JSON.parse(payloadText) : encodedPayload;

  if (!isRecord(payload)) {
    throw new Error(`CID '${cid}' did not contain a comment object`);
  }

  const communityAddress = getCommunityAddress(payload);
  if (!communityAddress) {
    throw new Error(`CID '${cid}' did not contain a community identifier`);
  }

  return communityAddress;
};

const getClientEntries = (pkc: PkcWithCidFetch): Map<string, CommentCidPayloadEntry> => {
  let entries = entriesByClient.get(pkc);
  if (!entries) {
    entries = new Map();
    entriesByClient.set(pkc, entries);
  }
  return entries;
};

const getEntry = (pkc: PkcWithCidFetch, cid: string): CommentCidPayloadEntry => {
  const entries = getClientEntries(pkc);
  let entry = entries.get(cid);
  if (!entry) {
    entry = {
      listeners: new Set(),
      snapshot: IDLE_SNAPSHOT,
    };
    entries.set(cid, entry);
  }
  return entry;
};

const notify = (entry: CommentCidPayloadEntry) => {
  for (const listener of entry.listeners) listener();
};

const startFetch = (pkc: PkcWithCidFetch, cid: string, entry: CommentCidPayloadEntry) => {
  if (entry.request || entry.snapshot.state !== 'idle') return;

  entry.snapshot = { state: 'fetching' };
  notify(entry);
  entry.request = pkc
    .fetchCid({ cid })
    .then((fetchedCid) => {
      entry.snapshot = {
        communityAddress: decodeCommentCidCommunityAddress(cid, fetchedCid),
        state: 'succeeded',
      };
    })
    .catch((error: unknown) => {
      entry.snapshot = {
        error: error instanceof Error ? error : new Error(String(error)),
        state: 'failed',
      };
    })
    .finally(() => {
      entry.request = undefined;
      notify(entry);
      if (entry.listeners.size === 0) getClientEntries(pkc).delete(cid);
    });
};

const subscribe = (pkc: PkcWithCidFetch, cid: string, listener: () => void) => {
  const entry = getEntry(pkc, cid);
  entry.listeners.add(listener);
  startFetch(pkc, cid, entry);

  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size === 0 && !entry.request) getClientEntries(pkc).delete(cid);
  };
};

const isPkcWithCidFetch = (value: unknown): value is PkcWithCidFetch => isRecord(value) && typeof value.fetchCid === 'function';

export const useCommentCidPayload = (commentCid: string | undefined): CommentCidPayloadSnapshot => {
  const account = useAccount();
  const pkc = isPkcWithCidFetch(account?.pkc) ? account.pkc : undefined;

  const subscribeToPayload = useCallback((listener: () => void) => (pkc && commentCid ? subscribe(pkc, commentCid, listener) : () => {}), [commentCid, pkc]);
  const getSnapshot = useCallback(() => (pkc && commentCid ? getEntry(pkc, commentCid).snapshot : IDLE_SNAPSHOT), [commentCid, pkc]);

  return useSyncExternalStore(subscribeToPayload, getSnapshot, () => IDLE_SNAPSHOT);
};
