import { useEffect, useState } from 'react';
import { useAccount } from '@bitsocial/bitsocial-react-hooks';
import { PubsubVoter, type PubsubVoterOptions } from '@bitsocial/pubsub-voting';

type HeliaNode = PubsubVoterOptions['helia'];

interface BrowserLibp2pAccount {
  pkc?: {
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

export const createReadOnlyPubsubVoter = (helia: HeliaNode) =>
  new PubsubVoter({
    helia,
    chains: () => undefined,
    dataPath: false,
  });

export const usePubsubVoter = (): PubsubVoterState => {
  const account = useAccount();
  const helia = getBrowserHeliaNode(account);
  const [construction, setConstruction] = useState<VoterConstruction>();

  useEffect(() => {
    if (!helia) return;

    let voter: PubsubVoter;
    try {
      voter = createReadOnlyPubsubVoter(helia);
      setConstruction({ helia, voter });
    } catch (error) {
      const constructionError = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to construct pubsub voter', constructionError);
      setConstruction({ helia, error: constructionError });
      return;
    }

    return () => {
      void voter.destroy().catch((error) => console.error('Failed to destroy pubsub voter', error));
    };
  }, [helia]);

  if (!helia) return { state: 'unavailable' };
  if (construction?.helia !== helia) return { state: 'constructing' };
  if (construction.error) return { state: 'failed', error: construction.error };
  if (construction.voter) return { state: 'ready', voter: construction.voter };
  return { state: 'constructing' };
};
