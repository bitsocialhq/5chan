import { useCallback, useRef } from 'react';

type PendingPublishRequest = {
  id: number;
  promise: Promise<void>;
  resolve: () => void;
};

const usePendingPublishRequest = () => {
  const nextRequestIdRef = useRef(0);
  const pendingRequestRef = useRef<PendingPublishRequest | null>(null);

  const startPendingPublishRequest = useCallback(() => {
    if (pendingRequestRef.current) {
      return { request: pendingRequestRef.current, started: false };
    }

    const id = nextRequestIdRef.current + 1;
    nextRequestIdRef.current = id;

    let resolveRequest: () => void = () => {};
    const promise = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });
    const request = { id, promise, resolve: resolveRequest };
    pendingRequestRef.current = request;

    return { request, started: true };
  }, []);

  const finishPendingPublishRequest = useCallback((requestId: number) => {
    const request = pendingRequestRef.current;
    if (!request || request.id !== requestId) {
      return;
    }

    pendingRequestRef.current = null;
    request.resolve();
  }, []);

  return { finishPendingPublishRequest, startPendingPublishRequest };
};

export default usePendingPublishRequest;
