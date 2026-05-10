import * as React from 'react';
import { createElement } from 'react';
import type { Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

export type ArchiveRouteRenderOptions = {
  root: Root;
  element: React.ReactNode;
  initialEntry: string;
  routePath?: string;
};

export const renderArchiveRoute = async ({ root, element, initialEntry, routePath = '/:boardIdentifier/archive' }: ArchiveRouteRenderOptions) => {
  let latestLocation = '';

  const LocationProbe = () => {
    const location = useLocation();
    React.useLayoutEffect(() => {
      latestLocation = location.pathname;
    }, [location.pathname]);
    return null;
  };

  await act(async () => {
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: [initialEntry] },
        createElement(Routes, {}, createElement(Route, { path: routePath, element }), createElement(Route, { path: '*', element })),
        createElement(LocationProbe),
      ),
    );
  });

  for (let i = 0; i < 6; i += 1) {
    await act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  return latestLocation;
};
