import type { ReactNode } from 'react';
import { useCurrentTime } from '../hooks/use-current-time';
import { getFormattedTimeAgo } from '../lib/utils/time-utils';
import Tooltip from './tooltip';

const TimeAgoTooltipContent = ({ timestamp }: { timestamp?: number }) => {
  useCurrentTime();
  return <>{timestamp === undefined || Number.isNaN(timestamp) ? '' : getFormattedTimeAgo(timestamp)}</>;
};

const TimeAgoTooltip = ({ timestamp, children }: { timestamp?: number; children: ReactNode }) => (
  <Tooltip content={<TimeAgoTooltipContent timestamp={timestamp} />}>{children}</Tooltip>
);

export default TimeAgoTooltip;
