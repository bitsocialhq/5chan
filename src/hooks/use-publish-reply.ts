import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Comment, useAccount, usePublishComment } from '@bitsocial/bitsocial-react-hooks';
import { useShallow } from 'zustand/react/shallow';
import { useDirectories } from './use-directories';
import usePublishReplyStore from '../stores/use-publish-reply-store';
import usePostNumberStore, { getScopedNumberToCidMap } from '../stores/use-post-number-store';
import { filterSameThreadQuotedCids, getQuotedCidsFromContent, mergeQuotedCids } from '../lib/utils/reply-quote-utils';
import { extractUnresolvedExternalQuoteReferences, getExternalQuoteStatusMessage } from '../lib/utils/external-quote-utils';
import { resolveExternalQuoteTarget } from '../lib/utils/external-quote-resolver';
import useChallengesStore from '../stores/use-challenges-store';
import usePublishAuthorDomainGuard, { getPublishAuthorDomainErrorMessage } from './use-publish-author-domain-guard';
import usePendingPublishRequest from './use-pending-publish-request';

type UsePublishReplyOptions = {
  cid: string;
  communityAddress?: string;
  postCid?: string;
};

const usePublishReply = ({ cid, communityAddress, postCid }: UsePublishReplyOptions) => {
  const { t } = useTranslation();
  const parentCid = cid;
  const account = useAccount();
  const directories = useDirectories();

  const { author, content, link, flairs, spoiler, publishCommentOptions } = usePublishReplyStore(
    useShallow((state) => ({
      author: state.author[parentCid],
      content: state.content[parentCid] || undefined,
      link: state.link[parentCid] || undefined,
      flairs: state.flairs[parentCid],
      spoiler: state.spoiler[parentCid] || false,
      publishCommentOptions: state.publishCommentOptions[parentCid],
    })),
  );

  const setPublishReplyStore = usePublishReplyStore((state) => state.setPublishReplyStore);
  const resetPublishReplyStore = usePublishReplyStore((state) => state.resetPublishReplyStore);
  const addChallenge = useChallengesStore((state) => state.addChallenge);
  const { blockedReason } = usePublishAuthorDomainGuard();
  const abandonPublishRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const startedPublishRequestIdRef = useRef(0);
  const [resolvedExternalQuotedCids, setResolvedExternalQuotedCids] = useState<string[] | undefined>();
  const [pendingPublishRequestId, setPendingPublishRequestId] = useState(0);
  const [pendingSyncedPublishRequestId, setPendingSyncedPublishRequestId] = useState(0);
  const startedSyncedPublishRequestIdRef = useRef(0);
  const [isResolvingExternalQuotes, setIsResolvingExternalQuotes] = useState(false);
  const [publishReplyError, setPublishReplyError] = useState<string | null>(null);
  const [publishReplyStateMessage, setPublishReplyStateMessage] = useState<string | null>(null);
  const { finishPendingPublishRequest, startPendingPublishRequest } = usePendingPublishRequest();
  const abandonCurrentPublish = useCallback(async () => {
    await abandonPublishRef.current?.();
  }, []);

  const createBaseOptions = useCallback(() => {
    const baseOptions: Comment = {
      communityAddress,
      parentCid,
      postCid: postCid ?? parentCid,
      content,
      link,
      flairs,
      spoiler,
      ...(publishCommentOptions?.challengeRequest ? { challengeRequest: publishCommentOptions.challengeRequest } : {}),
    };

    const displayName = author?.displayName;
    if (displayName) {
      baseOptions.author = { displayName };
    }

    return baseOptions;
  }, [author, content, flairs, link, parentCid, postCid, spoiler, communityAddress, publishCommentOptions?.challengeRequest]);

  const setPublishReplyOptions = useCallback(
    (options: Partial<Comment>) => {
      const baseOptions = createBaseOptions();
      const sanitizedOptions = Object.entries(options).reduce(
        (acc, [key, value]) => {
          acc[key] = value === '' ? undefined : value;
          return acc;
        },
        {} as Partial<Comment>,
      );

      const { communityAddress: nextCommunityAddress, ...restOptions } = sanitizedOptions;
      const resolvedCommunityAddress = nextCommunityAddress ?? baseOptions.communityAddress;
      const newOptions = {
        ...baseOptions,
        ...restOptions,
        ...(resolvedCommunityAddress ? { communityAddress: resolvedCommunityAddress } : {}),
      };
      setPublishReplyStore(newOptions);
    },
    [createBaseOptions, setPublishReplyStore],
  );

  const resetPublishReplyOptions = useCallback(() => resetPublishReplyStore(parentCid), [parentCid, resetPublishReplyStore]);

  const scopedNumberToCid = usePostNumberStore((state) => getScopedNumberToCidMap(state.numberToCid, communityAddress));
  const cidToPostCid = usePostNumberStore((state) => state.cidToPostCid);
  const threadPostCid = postCid ?? parentCid;
  const quotedCids = useMemo(() => getQuotedCidsFromContent(content, scopedNumberToCid), [content, scopedNumberToCid]);
  const unresolvedExternalQuoteReferences = useMemo(
    () =>
      extractUnresolvedExternalQuoteReferences({
        content,
        scopedNumberToCid,
        communityAddress,
      }),
    [content, scopedNumberToCid, communityAddress],
  );
  const publishResolvableQuoteReferences = useMemo(
    () => unresolvedExternalQuoteReferences.filter((reference) => reference.kind === 'same-board'),
    [unresolvedExternalQuoteReferences],
  );

  const mergedQuotedCids = useMemo(() => {
    const merged = new Set<string>();

    for (const cid of quotedCids ?? []) {
      merged.add(cid);
    }

    for (const cid of resolvedExternalQuotedCids ?? []) {
      merged.add(cid);
    }

    return merged.size > 0 ? [...merged] : undefined;
  }, [quotedCids, resolvedExternalQuotedCids]);

  const mergedPublishOptions = useMemo(() => {
    // Filter the FINAL payload so a reply only ever publishes same-thread quotedCids, even for any
    // that arrived via stored publishCommentOptions. The protocol rejects cross-thread quotes
    // (ERR_QUOTED_CID_NOT_UNDER_POST); cross-thread quotelinks still render/navigate via their text.
    const options = mergeQuotedCids(publishCommentOptions, mergedQuotedCids);
    if (!options?.quotedCids) {
      return options;
    }

    const sameThreadQuotedCids = filterSameThreadQuotedCids(options.quotedCids, cidToPostCid, threadPostCid);
    const { quotedCids: _crossThreadQuotedCids, ...optionsWithoutQuotedCids } = options;
    return sameThreadQuotedCids ? { ...optionsWithoutQuotedCids, quotedCids: sameThreadQuotedCids } : optionsWithoutQuotedCids;
  }, [publishCommentOptions, mergedQuotedCids, cidToPostCid, threadPostCid]);
  const publishOptionsWithAbandon = useMemo(
    () => ({
      ...mergedPublishOptions,
      onChallenge: async (...args: any[]) => {
        addChallenge(args, abandonCurrentPublish);
      },
    }),
    [abandonCurrentPublish, addChallenge, mergedPublishOptions],
  );

  const { index, publishComment, abandonPublish } = usePublishComment(publishOptionsWithAbandon);
  abandonPublishRef.current = abandonPublish;

  useEffect(() => {
    setResolvedExternalQuotedCids(undefined);
    setPublishReplyError(null);
    setPublishReplyStateMessage(null);
    setIsResolvingExternalQuotes(false);
  }, [blockedReason, content, communityAddress, flairs]);

  useEffect(() => {
    if (pendingPublishRequestId === 0 || pendingPublishRequestId === startedPublishRequestIdRef.current) {
      return;
    }

    const requestId = pendingPublishRequestId;
    startedPublishRequestIdRef.current = requestId;
    void Promise.resolve()
      .then(() => publishComment())
      .catch(() => undefined)
      .finally(() => finishPendingPublishRequest(requestId));
  }, [finishPendingPublishRequest, pendingPublishRequestId, publishComment]);

  const preparePublishReply = useCallback(
    async (requestId: number) => {
      setPublishReplyError(null);

      if (blockedReason) {
        setPublishReplyStateMessage(null);
        setPublishReplyError(getPublishAuthorDomainErrorMessage(blockedReason));
        finishPendingPublishRequest(requestId);
        return;
      }

      if (publishResolvableQuoteReferences.length === 0) {
        setResolvedExternalQuotedCids(undefined);
        setPublishReplyStateMessage(null);
        setPendingPublishRequestId(requestId);
        return;
      }

      if (!account?.id) {
        setPublishReplyError(t('external_quote_resolution_unavailable'));
        finishPendingPublishRequest(requestId);
        return;
      }

      setIsResolvingExternalQuotes(true);

      try {
        const resolvedCids = new Set<string>();

        for (const reference of publishResolvableQuoteReferences) {
          const resolvedTarget = await resolveExternalQuoteTarget({
            account,
            directories,
            onStatus: (status) => {
              setPublishReplyStateMessage(getExternalQuoteStatusMessage(t, status));
            },
            reference,
          });

          if (!resolvedTarget?.cid) {
            setPublishReplyError(
              t('external_quote_publish_missing', {
                interpolation: { escapeValue: false },
                quote: reference.raw,
              }),
            );
            finishPendingPublishRequest(requestId);
            return;
          }

          resolvedCids.add(resolvedTarget.cid);
        }

        setResolvedExternalQuotedCids(resolvedCids.size > 0 ? [...resolvedCids] : undefined);
        setPublishReplyStateMessage(null);
        setPendingPublishRequestId(requestId);
      } catch {
        setPublishReplyError(t('external_quote_resolution_unavailable'));
        finishPendingPublishRequest(requestId);
      } finally {
        setIsResolvingExternalQuotes(false);
      }
    },
    [account, blockedReason, directories, finishPendingPublishRequest, publishResolvableQuoteReferences, t],
  );

  const publishReply = useCallback(
    (options?: Partial<Comment>) => {
      const pendingRequest = startPendingPublishRequest();
      if (!pendingRequest.started) {
        return pendingRequest.request.promise;
      }

      if (options) {
        setPublishReplyOptions(options);
        setPendingSyncedPublishRequestId(pendingRequest.request.id);
        return pendingRequest.request.promise;
      }

      void preparePublishReply(pendingRequest.request.id).catch(() => finishPendingPublishRequest(pendingRequest.request.id));
      return pendingRequest.request.promise;
    },
    [finishPendingPublishRequest, preparePublishReply, setPublishReplyOptions, startPendingPublishRequest],
  );

  useEffect(() => {
    if (pendingSyncedPublishRequestId === 0 || pendingSyncedPublishRequestId === startedSyncedPublishRequestIdRef.current) {
      return;
    }

    const requestId = pendingSyncedPublishRequestId;
    startedSyncedPublishRequestIdRef.current = requestId;
    void preparePublishReply(requestId).catch(() => finishPendingPublishRequest(requestId));
  }, [finishPendingPublishRequest, pendingSyncedPublishRequestId, preparePublishReply]);

  return {
    isResolvingExternalQuotes,
    publishReply,
    publishReplyError,
    publishReplyStateMessage,
    setPublishReplyOptions,
    resetPublishReplyOptions,
    replyIndex: index,
  };
};

export default usePublishReply;
