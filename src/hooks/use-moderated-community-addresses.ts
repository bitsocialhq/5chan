import { useMemo } from 'react';
import type { Community } from '@bitsocial/bitsocial-react-hooks';
import { accountsStore as useAccountsStore, communitiesStore as useCommunitiesStore } from '../lib/bitsocial-internals/stores';
import { useDirectories } from './use-directories';
import { areStringArraysEqual, useAccountCommunityAddresses } from './use-account-community-addresses';
import { getModeratedCommunityAddresses } from '../lib/utils/mod-queue-utils';
import { normalizeBoardAddress } from '../lib/utils/directory-list-lookup-utils';

type AccountModerationSnapshot = {
  accountAddress: string | undefined;
  subscriptions: readonly string[];
};

type AccountWithModerationFields = {
  author?: {
    address?: string;
  };
  subscriptions?: string[];
};

type AccountsStoreState = {
  activeAccountId?: string;
  accounts: Record<string, AccountWithModerationFields | undefined>;
};

type CommunitiesStoreState = {
  communities: Record<string, Community | undefined>;
};

export type ModeratedCommunityAddressInputs = {
  accountAddress: string | undefined;
  accountCommunityAddresses: string[];
  candidateCommunityAddresses: string[];
};

const EMPTY_SUBSCRIPTIONS: readonly string[] = [];

const areAccountModerationSnapshotsEqual = (previous: AccountModerationSnapshot | undefined, next: AccountModerationSnapshot | undefined) => {
  if (previous === next) {
    return true;
  }
  if (!previous || !next) {
    return previous === next;
  }
  return previous.accountAddress === next.accountAddress && areStringArraysEqual(previous.subscriptions, next.subscriptions);
};

const getAccountModerationSnapshot = (state: AccountsStoreState): AccountModerationSnapshot => {
  const account = state.activeAccountId ? state.accounts[state.activeAccountId] : undefined;
  return {
    accountAddress: account?.author?.address,
    subscriptions: account?.subscriptions ?? EMPTY_SUBSCRIPTIONS,
  };
};

const addUniqueAddress = (addresses: string[], address: string | undefined) => {
  if (address && !addresses.includes(address)) {
    addresses.push(address);
  }
};

const getCommunityByAddress = (communities: Record<string, Community | undefined>, communityAddress: string): Community | undefined => {
  const exactMatch = communities[communityAddress];
  if (exactMatch) {
    return exactMatch;
  }

  const normalizedAddress = normalizeBoardAddress(communityAddress);
  return Object.entries(communities).find(([key, community]) => {
    const candidateAddress = typeof community?.address === 'string' ? community.address : key;
    return normalizeBoardAddress(candidateAddress) === normalizedAddress;
  })?.[1];
};

export const useModeratedCommunityAddressInputs = (): ModeratedCommunityAddressInputs => {
  const { accountAddress, subscriptions } = useAccountsStore(getAccountModerationSnapshot, areAccountModerationSnapshotsEqual);
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
    for (const address of subscriptions) {
      addUniqueAddress(addresses, address);
    }
    return addresses;
  }, [accountCommunityAddresses, directories, subscriptions]);

  return useMemo(
    () => ({
      accountAddress,
      accountCommunityAddresses,
      candidateCommunityAddresses,
    }),
    [accountAddress, accountCommunityAddresses, candidateCommunityAddresses],
  );
};

export const useModeratedCommunityAddressesForInputs = ({
  accountAddress,
  accountCommunityAddresses,
  candidateCommunityAddresses,
}: ModeratedCommunityAddressInputs): string[] =>
  useCommunitiesStore(
    (state: CommunitiesStoreState) =>
      getModeratedCommunityAddresses({
        accountAddress,
        accountCommunityAddresses,
        candidateCommunityAddresses,
        communities: candidateCommunityAddresses.map((candidateAddress) => getCommunityByAddress(state.communities, candidateAddress)),
      }),
    areStringArraysEqual,
  );

export const useModeratedCommunityAddresses = (): string[] => {
  const inputs = useModeratedCommunityAddressInputs();
  return useModeratedCommunityAddressesForInputs(inputs);
};
