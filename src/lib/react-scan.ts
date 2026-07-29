type ReactScanReportRow = { count: number; time: number; unnecessary: number };

if (import.meta.env.DEV) {
  import('react-scan').then(({ scan }) => {
    // react-scan's own `getReport()` is unusable here: it reads `Store.legacyReportData`, which
    // 0.5.3 never writes to, and the live `Store.reportData` is only populated while the toolbar
    // is visible AND a component is manually focused in the inspector — neither holds under
    // automation. `onRender` has no such gate, so we accumulate the report ourselves.
    const report = new Map<string, ReactScanReportRow>();

    scan({
      enabled: true,
      showToolbar: !(window as any).__PROFILING__,
      // Off by default: react-scan warns this adds meaningful overhead, which would skew the
      // timings collected alongside it. Opt in per run when you specifically need wasted-render
      // attribution, and read `time` as relative rather than absolute for that run.
      trackUnnecessaryRenders: !!(window as any).__PROFILING_UNNECESSARY__,
      onRender: (fiber, renders) => {
        for (const render of renders) {
          const name = render.componentName || (fiber?.type as any)?.displayName || (fiber?.type as any)?.name;
          if (!name) {
            continue;
          }
          const row = report.get(name) || { count: 0, time: 0, unnecessary: 0 };
          row.count += render.count || 1;
          row.time += render.time || 0;
          if (render.unnecessary) {
            row.unnecessary += render.count || 1;
          }
          report.set(name, row);
        }
      },
    });

    // Returns a plain object rather than a Map: callers serialize this with JSON.stringify, and
    // JSON.stringify(new Map()) is always "{}" regardless of contents.
    (window as any).__getReactScanReport = () => Object.fromEntries(report);
    (window as any).__resetReactScanReport = () => report.clear();

    const notReady = async () => ({
      error: 'element-source is not ready yet.',
    });

    const elementSourceApi: any = {
      ready: false,
      error: null,
      resolve: notReady,
      resolveBySelector: async () => ({
        error: 'element-source is not ready yet.',
      }),
      resolveAtPoint: async () => ({
        error: 'element-source is not ready yet.',
      }),
      formatStack: () => '',
    };

    (window as any).__ELEMENT_SOURCE__ = elementSourceApi;

    import('element-source')
      .then(({ formatStack, resolveElementInfo }) => {
        const resolve = async (node: unknown) => {
          if (!(node instanceof Element)) {
            return {
              error: 'Expected a DOM Element.',
            };
          }

          try {
            const info = await resolveElementInfo(node);
            return {
              ...info,
              available: Boolean(info.source || info.stack.length || info.componentName),
            };
          } catch (error) {
            return {
              error: error instanceof Error ? error.message : String(error),
            };
          }
        };

        Object.assign(elementSourceApi, {
          ready: true,
          resolve,
          resolveBySelector: async (selector: string) => {
            const element = document.querySelector(selector);
            if (!(element instanceof Element)) {
              return {
                error: `No element matched selector: ${selector}`,
              };
            }
            return resolve(element);
          },
          resolveAtPoint: async (x: number, y: number) => {
            const element = document.elementFromPoint(x, y);
            if (!(element instanceof Element)) {
              return {
                error: `No element found at point (${x}, ${y})`,
              };
            }
            return resolve(element);
          },
          formatStack: (stack: unknown, maxLines = 3) => (Array.isArray(stack) ? formatStack(stack as any, maxLines) : ''),
        });
      })
      .catch((error) => {
        elementSourceApi.error = error instanceof Error ? error.message : String(error);
      });
  });
}
