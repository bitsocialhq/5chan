import { useCallback, useRef, useState } from 'react';

const usePublishSubmissionGuard = () => {
  const publishSubmissionInFlightRef = useRef(false);
  const [isPublishSubmissionInFlight, setIsPublishSubmissionInFlight] = useState(false);

  const runPublishSubmission = useCallback(async (publish: () => Promise<void>) => {
    if (publishSubmissionInFlightRef.current) {
      return;
    }

    publishSubmissionInFlightRef.current = true;
    setIsPublishSubmissionInFlight(true);

    try {
      await publish();
    } finally {
      publishSubmissionInFlightRef.current = false;
      setIsPublishSubmissionInFlight(false);
    }
  }, []);

  return { isPublishSubmissionInFlight, runPublishSubmission };
};

export default usePublishSubmissionGuard;
