import type { DirectoryCommunity } from '../../hooks/use-directories';
import { isFlashBoardRoute } from '../../lib/utils/route-utils';

interface CatalogButtonVisibilityContext {
  isInAllView?: boolean;
  isInSubscriptionsView?: boolean;
  isInModView?: boolean;
}

export const shouldShowCatalogButton = (
  boardIdentifier: string | undefined,
  directories: DirectoryCommunity[],
  { isInAllView, isInSubscriptionsView, isInModView }: CatalogButtonVisibilityContext,
): boolean => {
  if (isInAllView || isInSubscriptionsView || isInModView) {
    return true;
  }
  return !isFlashBoardRoute(boardIdentifier, directories);
};
