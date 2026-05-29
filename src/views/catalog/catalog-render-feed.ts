export const getCatalogRenderFeed = <T>(processedFeed: readonly T[], deferredProcessedFeed: readonly T[]): readonly T[] =>
  deferredProcessedFeed.length === 0 && processedFeed.length > 0 ? processedFeed : deferredProcessedFeed;
