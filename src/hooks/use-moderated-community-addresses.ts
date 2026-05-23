import { useMemo } from 'react';
import { useAccount, useCommunities } from '@bitsocial/bitsocial-react-hooks';
import { useDirectories } from './use-directories';
import { useCommunityIdentifiers } from './use-community-identifiers';
import { useAccountCommunityAddresses } from './use-account-community-addresses';
import { getModeratedCommunityAddresses } from '../lib/utils/mod-queue-utils';

const addUniqueAddress = (addresses: string[], address: string | undefined) => {
  if (address && !addresses.includes(address)) {
    addresses.push(address);
  }
};

export const useModeratedCommunityAddresses = (): string[] => {
  const account = useAccount();
  const accountAddress = account?.author?.address;
  const accountCommunityAddresses = useAccountCommunityAddresses();
  const directories = useDirectories();

  const candidateCommunityAddresses = useMemo(() => {
    const addresses: string[] = [];
    for (const address of accountCommunityAddresses) {
      addUniqueAddress(addresses, address);
    }
    for (const directory of directories) {
      addUniqueAddress(addresses, directory.address);
    }
    for (const address of account?.subscriptions ?? []) {
      addUniqueAddress(addresses, address);
    }
    return addresses;
  }, [account?.subscriptions, accountCommunityAddresses, directories]);

  const candidateCommunities = useCommunityIdentifiers(candidateCommunityAddresses);
  const { communities } = useCommunities(candidateCommunities.length > 0 ? { communities: candidateCommunities } : undefined);

  return useMemo(
    () =>
      getModeratedCommunityAddresses({
        accountAddress,
        accountCommunityAddresses,
        candidateCommunityAddresses,
        communities,
      }),
    [accountAddress, accountCommunityAddresses, candidateCommunityAddresses, communities],
  );
};
