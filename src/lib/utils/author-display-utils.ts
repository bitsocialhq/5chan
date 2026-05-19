import known5chanDeveloperEntries from '../../data/known-5chan-developers.json';

interface Known5chanDeveloperEntry {
  address: string;
  githubProfileUrl?: string;
  name?: string;
}

export const KNOWN_5CHAN_DEVELOPER_ENTRIES = known5chanDeveloperEntries as readonly Known5chanDeveloperEntry[];

type AuthorBadgeIcon = 'admin' | 'mod';

interface AuthorBadge {
  capitalizeLabel?: boolean;
  icon: AuthorBadgeIcon;
  label: string;
  title: '5chan Dev' | 'administrator_of_this_board' | 'moderator_of_this_board';
}

const normalizeBoardRole = (role?: string): string | undefined => {
  const normalizedRole = role?.trim();
  if (!normalizedRole) return undefined;
  return normalizedRole.toLowerCase() === 'moderator' ? 'mod' : normalizedRole;
};

export const isKnown5chanDeveloper = (address?: string): boolean =>
  typeof address === 'string' && KNOWN_5CHAN_DEVELOPER_ENTRIES.some((developer) => developer.address === address);

/** 5chan Dev capcode only — never board owner/mod badges. */
export const get5chanDeveloperBadge = (address?: string): AuthorBadge | undefined => (isKnown5chanDeveloper(address) ? getAuthorBadge({ address }) : undefined);

export const getAuthorBadge = ({ address, role }: { address?: string; role?: string }): AuthorBadge | undefined => {
  const boardRole = normalizeBoardRole(role);
  const isDeveloper = isKnown5chanDeveloper(address);

  if (isDeveloper) {
    return {
      icon: 'admin',
      label: '5chan Dev',
      title: '5chan Dev',
    };
  }

  if (!boardRole) return undefined;

  const isMod = boardRole?.toLowerCase() === 'mod';
  return {
    capitalizeLabel: true,
    icon: isMod ? 'mod' : 'admin',
    label: `Board ${boardRole}`,
    title: isMod ? 'moderator_of_this_board' : 'administrator_of_this_board',
  };
};
