import { accountsStore as useAccountsStore } from '../lib/bitsocial-internals/stores';
import { getEquivalentCommunityAddressGroupKey, pickPreferredEquivalentCommunityAddress } from '../lib/bitsocial-internals/utils';

type AccountWithCommunities = {
  communities?: Record<string, unknown>;
};

type AccountsStoreState = {
  activeAccountId?: string;
  accounts: Record<string, AccountWithCommunities | undefined>;
};

const EMPTY_ACCOUNT_COMMUNITY_ADDRESSES: string[] = [];

export const areStringArraysEqual = (previous: readonly string[] | undefined, next: readonly string[] | undefined) => {
  if (previous === next) {
    return true;
  }
  if (!previous || !next) {
    return previous === next;
  }
  if (previous.length !== next.length) {
    return false;
  }
  return previous.every((value, index) => value === next[index]);
};

const getAccountCommunityAddresses = (state: AccountsStoreState): string[] => {
  const accountCommunities = state.activeAccountId ? state.accounts[state.activeAccountId]?.communities : undefined;
  if (!accountCommunities) {
    return EMPTY_ACCOUNT_COMMUNITY_ADDRESSES;
  }

  const groupedAddresses = new Map<string, string[]>();
  for (const communityAddress of Object.keys(accountCommunities)) {
    const groupKey = getEquivalentCommunityAddressGroupKey(communityAddress);
    const addresses = groupedAddresses.get(groupKey);
    if (addresses) {
      addresses.push(communityAddress);
    } else {
      groupedAddresses.set(groupKey, [communityAddress]);
    }
  }

  return [...groupedAddresses.values()].map((addresses) => pickPreferredEquivalentCommunityAddress(addresses)).sort();
};

export const useAccountCommunityAddresses = (): string[] => useAccountsStore(getAccountCommunityAddresses, areStringArraysEqual);
