import { memo } from 'react';
import { useCommunities } from '@bitsocial/bitsocial-react-hooks';
import { useCommunityIdentifiers } from '../../hooks/use-community-identifiers';

// Warms community metadata for the candidate mod queue boards without rendering
// anything. Shared by the mod queue route and the board mod-queue button so
// neither has to reach into the other for it.
const ModQueueCommunityMetadataLoader = memo(({ candidateCommunityAddresses }: { candidateCommunityAddresses: string[] }) => {
  const candidateCommunities = useCommunityIdentifiers(candidateCommunityAddresses);
  useCommunities(candidateCommunities.length > 0 ? { communities: candidateCommunities } : undefined);
  return null;
});

export default ModQueueCommunityMetadataLoader;
