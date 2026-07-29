import { useMemo } from 'react';
import { useDirectories } from './use-directories';
import useAllFeedFilterStore from '../stores/use-all-feed-filter-store';

export const useFilteredDirectoryAddresses = () => {
  const directories = useDirectories();
  const filter = useAllFeedFilterStore((state) => state.filter);

  const filteredAddresses = useMemo(() => {
    if (filter === 'all') {
      return directories.map((community) => community.address);
    }
    if (filter === 'nsfw') {
      return directories.filter((community) => community.nsfw === true).map((community) => community.address);
    }
    // filter === 'sfw'
    return directories.filter((community) => community.nsfw !== true).map((community) => community.address);
  }, [directories, filter]);

  return filteredAddresses;
};
