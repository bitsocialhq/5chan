import { ComponentType, use } from 'react';

type SectionModule = { default: ComponentType };

/** The fields React reads off a promise passed to `use()`. */
type TrackedPromiseState = {
  reason?: unknown;
  status?: 'fulfilled' | 'rejected';
  value?: SectionModule;
};

export type SectionLoader = () => Promise<SectionModule>;

/**
 * Caches a settings section's dynamic import and tags the promise with the
 * state `use()` reads, so a section whose chunk is already loaded renders in
 * the same commit as the click that expanded it. `lazy()` cannot do that: it
 * only resolves its payload the first time the section renders, and React
 * schedules that resolution as a separate task, which left every section
 * visibly loading after the click even once its chunk was cached.
 */
export const createSectionLoader = (load: () => Promise<SectionModule>): SectionLoader => {
  let tracked: Promise<SectionModule> | undefined;

  return () => {
    if (!tracked) {
      const pending = load();
      const trackedState = pending as Promise<SectionModule> & TrackedPromiseState;
      pending.then(
        (module) => {
          trackedState.status = 'fulfilled';
          trackedState.value = module;
        },
        (reason) => {
          trackedState.status = 'rejected';
          trackedState.reason = reason;
        },
      );
      tracked = pending;
    }

    return tracked;
  };
};

/** Renders a code split section, suspending only while its chunk is still loading. */
const LazySection = ({ load }: { load: SectionLoader }) => {
  const { default: Section } = use(load());
  return <Section />;
};

export default LazySection;
