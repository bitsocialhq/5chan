import { useEffect } from 'react';
import { observeExclusiveVideoPlayback, observeOffscreenMediaPlayback } from '../lib/utils/media-playback-utils';

const useSuspendOffscreenMediaPlayback = () => {
  useEffect(() => {
    const cleanupOffscreenPlayback = observeOffscreenMediaPlayback(document.body);
    const cleanupExclusiveVideoPlayback = observeExclusiveVideoPlayback(document);

    return () => {
      cleanupExclusiveVideoPlayback();
      cleanupOffscreenPlayback();
    };
  }, []);
};

export default useSuspendOffscreenMediaPlayback;
