import { PubsubVoter, type ChainClient, type ChainClientFactory, type NameResolver, type PubsubVoterOptions } from '@bitsocial/pubsub-voting';
import { createPublicClient, fallback, http } from 'viem';
import { baseSepolia } from 'viem/chains';

export const BASE_SEPOLIA_VOTING_RPC_URLS = ['https://base-sepolia.drpc.org', 'https://sepolia.base.org', 'https://sepolia-preconf.base.org'] as const;

const votingChainClients = new Map<number, ChainClient>([
  [
    baseSepolia.id,
    createPublicClient({
      chain: baseSepolia,
      transport: fallback(
        BASE_SEPOLIA_VOTING_RPC_URLS.map((url) => http(url, { retryCount: 0, timeout: 10_000 })),
        { retryCount: 1 },
      ),
    }) as ChainClient,
  ],
]);

/** Return the one shared client for a supported voting chain; unknown chains recuse. */
export const getVotingChainClient: ChainClientFactory = ({ chainId }) => votingChainClients.get(chainId);

interface BrowserPubsubVoterOptions {
  helia: PubsubVoterOptions['helia'];
  nameResolvers?: NameResolver[];
}

/** Browser storage is persistent IndexedDB whenever dataPath is left enabled. */
export const createBrowserPubsubVoter = ({ helia, nameResolvers }: BrowserPubsubVoterOptions): PubsubVoter =>
  new PubsubVoter({
    helia,
    chains: getVotingChainClient,
    nameResolvers,
  });

const votersByHelia = new WeakMap<PubsubVoterOptions['helia'], Map<NameResolver[] | undefined, PubsubVoter>>();

/** Share one long-lived voter across every view using the same PKC node and resolvers. */
export const getOrCreateBrowserPubsubVoter = ({ helia, nameResolvers }: BrowserPubsubVoterOptions): PubsubVoter => {
  let votersByResolvers = votersByHelia.get(helia);
  if (!votersByResolvers) {
    votersByResolvers = new Map();
    votersByHelia.set(helia, votersByResolvers);
  }

  const existing = votersByResolvers.get(nameResolvers);
  if (existing) return existing;

  const voter = createBrowserPubsubVoter({ helia, nameResolvers });
  votersByResolvers.set(nameResolvers, voter);
  return voter;
};
