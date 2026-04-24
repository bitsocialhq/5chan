import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useFeedCacheStore, { CachedFeed } from '../../stores/use-feed-cache-store';
import { getFeedCacheKey, getFeedType, isFeedRoute } from '../../lib/utils/route-utils';
import { TIME_FILTER_QUERY_PARAM } from '../../lib/utils/time-filter-utils';
import Board from '../../views/board';
import Catalog from '../../views/catalog';
import styles from './feed-cache-container.module.css';

interface FeedContextFromKey {
  viewType: 'all' | 'subs' | 'mod' | 'board';
  boardIdentifier?: string;
  timeFilterName?: string;
}

const parseFeedKey = (key: string): FeedContextFromKey => {
  const [pathname, search = ''] = key.split('?');
  const segments = pathname.split('/').filter(Boolean);
  const timeFilterName = new URLSearchParams(search).get(TIME_FILTER_QUERY_PARAM) || undefined;

  const filteredSegments = segments.filter((s) => s !== 'catalog');
  if (filteredSegments[0] === 'all') {
    return { viewType: 'all', timeFilterName };
  }
  if (filteredSegments[0] === 'subs') {
    return { viewType: 'subs', timeFilterName };
  }
  if (filteredSegments[0] === 'mod') {
    return { viewType: 'mod', timeFilterName };
  }

  return {
    viewType: 'board',
    boardIdentifier: filteredSegments[0],
  };
};

interface CachedFeedWrapperProps {
  feed: CachedFeed;
  isVisible: boolean;
}

const CachedFeedWrapper = ({ feed, isVisible }: CachedFeedWrapperProps) => {
  const context = parseFeedKey(feed.key);

  return (
    <div className={isVisible ? styles.visible : styles.hidden}>
      {feed.type === 'catalog' ? (
        <Catalog
          feedCacheKey={feed.key}
          viewType={context.viewType}
          boardIdentifier={context.boardIdentifier}
          timeFilterNameFromCache={context.timeFilterName}
          isVisible={isVisible}
        />
      ) : (
        <Board
          feedCacheKey={feed.key}
          viewType={context.viewType}
          boardIdentifier={context.boardIdentifier}
          timeFilterNameFromCache={context.timeFilterName}
          isVisible={isVisible}
        />
      )}
    </div>
  );
};

const FeedCacheContainer = () => {
  const location = useLocation();
  const cachedFeeds = useFeedCacheStore((state) => state.cachedFeeds);
  const accessFeed = useFeedCacheStore((state) => state.accessFeed);

  const currentFeedKey = getFeedCacheKey(location.pathname, location.search);
  const isOnFeedRoute = isFeedRoute(location.pathname);
  const feedType = getFeedType(location.pathname);

  useEffect(() => {
    if (isOnFeedRoute && currentFeedKey && feedType) {
      accessFeed(currentFeedKey, feedType);
    }
  }, [currentFeedKey, isOnFeedRoute, feedType, accessFeed]);

  return (
    <>
      {cachedFeeds.map((feed) => (
        <CachedFeedWrapper key={feed.key} feed={feed} isVisible={isOnFeedRoute && feed.key === currentFeedKey} />
      ))}
    </>
  );
};

export default FeedCacheContainer;
