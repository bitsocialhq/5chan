import { useEffect, useState } from 'react';
import { useAccount } from '@bitsocial/bitsocial-react-hooks';
import { PubsubVoter, type NameResolver, type PubsubVoterOptions } from '@bitsocial/pubsub-voting';
import { getOrCreateBrowserPubsubVoter } from '../lib/pubsub-voter';

type HeliaNode = PubsubVoterOptions['helia'];

interface BrowserLibp2pAccount {
  pkc?: {
    nameResolvers?: NameResolver[];
    clients?: {
      libp2pJsClients?: {
        libp2pjs?: {
          heliaNode?: HeliaNode;
        };
      };
    };
  };
}

interface VoterConstruction {
  helia: HeliaNode;
  nameResolvers?: NameResolver[];
  voter?: PubsubVoter;
  error?: Error;
}

export type PubsubVoterState =
  | { state: 'unavailable'; voter?: undefined; error?: undefined }
  | { state: 'constructing'; voter?: undefined; error?: undefined }
  | { state: 'ready'; voter: PubsubVoter; error?: undefined }
  | { state: 'failed'; voter?: undefined; error: Error };

export const getBrowserHeliaNode = (account: unknown): HeliaNode | undefined => {
  if (!account || typeof account !== 'object') return undefined;
  return (account as BrowserLibp2pAccount).pkc?.clients?.libp2pJsClients?.libp2pjs?.heliaNode;
};

export const getBrowserNameResolvers = (account: unknown): NameResolver[] | undefined => {
  if (!account || typeof account !== 'object') return undefined;
  return (account as BrowserLibp2pAccount).pkc?.nameResolvers;
};

export const usePubsubVoter = (): PubsubVoterState => {
  const account = useAccount();
  const helia = getBrowserHeliaNode(account);
  const nameResolvers = getBrowserNameResolvers(account);
  const [construction, setConstruction] = useState<VoterConstruction>();

  useEffect(() => {
    if (!helia) return;

    try {
      const voter = getOrCreateBrowserPubsubVoter({ helia, nameResolvers });
      setConstruction({ helia, nameResolvers, voter });
    } catch (error) {
      const constructionError = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to construct pubsub voter', constructionError);
      setConstruction({ helia, nameResolvers, error: constructionError });
    }
  }, [helia, nameResolvers]);

  if (!helia) return { state: 'unavailable' };
  if (construction?.helia !== helia || construction.nameResolvers !== nameResolvers) return { state: 'constructing' };
  if (construction.error) return { state: 'failed', error: construction.error };
  if (construction.voter) return { state: 'ready', voter: construction.voter };
  return { state: 'constructing' };
};
