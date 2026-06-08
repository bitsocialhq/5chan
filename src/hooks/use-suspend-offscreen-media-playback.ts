import { useEffect } from 'react';
import { observeOffscreenMediaPlayback } from '../lib/utils/media-playback-utils';

const useSuspendOffscreenMediaPlayback = () => {
  useEffect(() => observeOffscreenMediaPlayback(document.body), []);
};

export default useSuspendOffscreenMediaPlayback;
