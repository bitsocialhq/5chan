import type { Comment } from '@bitsocial/bitsocial-react-hooks';
import communitiesStore from '@bitsocial/bitsocial-react-hooks/dist/stores/communities';
import { getCommentCommunityAddress } from './comment-utils';

type CommunityLike = {
  roles?: Record<string, { role?: string }>;
};

const compiledRegexCache = new Map<string, RegExp>();
const commentTextCache = new WeakMap<Comment, string>();
const MAX_COMPILED_REGEX_CACHE_SIZE = 500;

const getCompiledRegex = (pattern: string, flags = ''): RegExp => {
  const cacheKey = `${pattern}\u0000${flags}`;
  const cachedRegex = compiledRegexCache.get(cacheKey);
  if (cachedRegex) return cachedRegex;

  const regex = new RegExp(pattern, flags);
  if (compiledRegexCache.size >= MAX_COMPILED_REGEX_CACHE_SIZE) {
    compiledRegexCache.clear();
  }
  compiledRegexCache.set(cacheKey, regex);
  return regex;
};

const testRegex = (regex: RegExp, text: string): boolean => {
  regex.lastIndex = 0;
  return regex.test(text);
};

const getCommentSearchText = (comment: Comment): string => {
  const cachedText = commentTextCache.get(comment);
  if (cachedText !== undefined) return cachedText;

  const searchText = `${comment?.title?.toLowerCase() || ''} ${comment?.content?.toLowerCase() || ''}`;
  commentTextCache.set(comment, searchText);
  return searchText;
};

/**
 * Checks if a text matches a pattern according to various pattern matching rules:
 * - Whole word matching: 'feel' matches 'feel' but not 'feeling'
 * - AND operator: 'feel girlfriend' matches both words in any order
 * - OR operator: 'feel|girlfriend' matches either word
 * - Mixed operators: 'girlfriend|boyfriend feel' matches complex logic
 * - Exact match: "that feel when" matches the exact phrase
 * - Wildcards: 'feel*' matches 'feel', 'feels', 'feeling', etc.
 * - Regex: /pattern/flags for regular expressions
 *
 * @param text The text to check against the pattern
 * @param pattern The pattern to match
 * @returns True if the text matches the pattern, false otherwise
 */
export const matchesPattern = (text: string, pattern: string): boolean => {
  if (!pattern || !text) return false;

  const textLower = text.toLowerCase();

  try {
    // Check if it's a regex pattern (starts and ends with /)
    if (pattern.startsWith('/') && pattern.length > 2 && /\/[gimsuy]*$/.test(pattern)) {
      const lastSlashIndex = pattern.lastIndexOf('/');
      const regexPattern = pattern.substring(1, lastSlashIndex);
      const flags = pattern.substring(lastSlashIndex + 1);
      return testRegex(getCompiledRegex(regexPattern, flags), textLower);
    }
    // Check if it's an exact match pattern (surrounded by quotes)
    else if (pattern.startsWith('"') && pattern.endsWith('"') && pattern.length > 2) {
      const exactPattern = pattern.substring(1, pattern.length - 1).toLowerCase();
      return textLower.includes(exactPattern);
    }
    // Check for OR patterns (contains |)
    else if (pattern.includes('|')) {
      const orGroups = pattern.split(' ').filter(Boolean);

      // Process each group (which might contain OR operators)
      return orGroups.every((group) => {
        const orTerms = group.split('|').map((term) => term.toLowerCase());
        return orTerms.some((term) => {
          // Handle wildcards in OR terms
          if (term.includes('*')) {
            const regexPattern = term.replace(/\*/g, '.*').toLowerCase();
            return testRegex(getCompiledRegex(`\\b${regexPattern}\\b`, 'i'), textLower);
          } else {
            // Match whole word only
            return testRegex(getCompiledRegex(`\\b${term}\\b`, 'i'), textLower);
          }
        });
      });
    }
    // Check for AND patterns (space-separated words)
    else if (pattern.includes(' ')) {
      const andTerms = pattern
        .split(' ')
        .filter(Boolean)
        .map((term) => term.toLowerCase());
      return andTerms.every((term) => {
        // Handle wildcards in AND terms
        if (term.includes('*')) {
          const regexPattern = term.replace(/\*/g, '.*').toLowerCase();
          return testRegex(getCompiledRegex(`\\b${regexPattern}\\b`, 'i'), textLower);
        } else {
          // Match whole word only
          return testRegex(getCompiledRegex(`\\b${term}\\b`, 'i'), textLower);
        }
      });
    }
    // Handle wildcard patterns
    else if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\*/g, '.*').toLowerCase();
      return testRegex(getCompiledRegex(`\\b${regexPattern}\\b`, 'i'), textLower);
    }
    // Simple whole word match
    else {
      return testRegex(getCompiledRegex(`\\b${pattern.toLowerCase()}\\b`, 'i'), textLower);
    }
  } catch (error) {
    // If regex parsing fails, fall back to simple includes
    console.error('Pattern matching error:', error);
    const simplifiedPattern = pattern.toLowerCase();
    return textLower.includes(simplifiedPattern);
  }
};

/**
 * Checks if a user ID matches a pattern
 *
 * @param comment The comment to check
 * @param pattern The pattern to match (without the # prefix)
 * @returns True if the user ID matches the pattern, false otherwise
 */
export const userIdMatchesPattern = (comment: Comment, pattern: string): boolean => {
  if (!pattern || !comment?.author) return false;

  // Check both address and shortAddress if available
  const address = comment.author.address || '';
  const shortAddress = comment.author.shortAddress || '';

  return address.includes(pattern) || shortAddress.includes(pattern);
};

/**
 * Checks if a display name matches a pattern
 *
 * @param comment The comment to check
 * @param pattern The pattern to match (without the ## prefix)
 * @returns True if the display name matches the pattern, false otherwise
 */
export const displayNameMatchesPattern = (comment: Comment, pattern: string): boolean => {
  if (!pattern) return false;

  // Special case for "Anonymous" to match undefined display names
  if (pattern.toLowerCase() === 'anonymous') {
    return comment?.author?.displayName === undefined;
  }

  if (!comment?.author?.displayName) return false;

  return comment.author.displayName.toLowerCase().includes(pattern.toLowerCase());
};

/**
 * Checks if a user has a specific role
 *
 * @param comment The comment to check
 * @param role The role to check for (without the #!# prefix)
 * @returns True if the user has the specified role, false otherwise
 */
export const userHasRole = (comment: Comment, role: string): boolean => {
  const communityAddress = getCommentCommunityAddress(comment);

  if (!role || !comment?.author?.address || !communityAddress) {
    return false;
  }

  const communities = communitiesStore.getState().communities;
  const community = communities[communityAddress] as CommunityLike | undefined;

  if (!community?.roles) {
    return false;
  }

  const userRole = community.roles[comment.author.address]?.role;

  // Handle different role names (moderator/mod)
  if ((role.toLowerCase() === 'moderator' || role.toLowerCase() === 'mod') && userRole === 'moderator') {
    return true;
  }

  return userRole?.toLowerCase() === role.toLowerCase();
};

/**
 * Parses a pattern that may contain special filters and content filters
 *
 * @param pattern The pattern to parse
 * @returns An object containing the parsed special filters and content filters
 */
export const parsePattern = (
  pattern: string,
): {
  specialFilters: { type: 'userId' | 'displayName' | 'role'; value: string }[];
  contentFilter: string;
} => {
  if (!pattern) return { specialFilters: [], contentFilter: '' };

  const parts = pattern.split(' ');
  const specialFilters: { type: 'userId' | 'displayName' | 'role'; value: string }[] = [];
  const contentParts: string[] = [];

  parts.forEach((part) => {
    if (part.startsWith('#') && !part.startsWith('##') && !part.startsWith('#!#')) {
      specialFilters.push({ type: 'userId', value: part.substring(1) });
    } else if (part.startsWith('##')) {
      specialFilters.push({ type: 'displayName', value: part.substring(2) });
    } else if (part.startsWith('#!#')) {
      specialFilters.push({ type: 'role', value: part.substring(3) });
    } else {
      contentParts.push(part);
    }
  });

  return {
    specialFilters,
    contentFilter: contentParts.join(' '),
  };
};

/**
 * Checks if a comment matches a pattern in its title or content,
 * or if it matches special filters for user ID, display name, or role
 *
 * @param comment The comment to check
 * @param pattern The pattern to match
 * @returns True if the comment matches the pattern, false otherwise
 */
export const commentMatchesPattern = (comment: Comment, pattern: string): boolean => {
  if (!pattern || !comment) return false;

  // Check if the pattern contains spaces, which might indicate combined filters
  if (pattern.includes(' ') && (pattern.includes('#') || pattern.includes('##') || pattern.includes('#!#'))) {
    // Parse the pattern into special filters and content filter
    const { specialFilters, contentFilter } = parsePattern(pattern);

    // If there are special filters, check if the comment matches all of them
    if (specialFilters.length > 0) {
      const allSpecialFiltersMatch = specialFilters.every((filter) => {
        if (filter.type === 'userId') {
          return userIdMatchesPattern(comment, filter.value);
        } else if (filter.type === 'displayName') {
          return displayNameMatchesPattern(comment, filter.value);
        } else if (filter.type === 'role') {
          return userHasRole(comment, filter.value);
        }
        return false;
      });

      // If there's also a content filter, check if the comment matches it as well
      if (contentFilter) {
        return allSpecialFiltersMatch && matchesPattern(getCommentSearchText(comment), contentFilter);
      }

      return allSpecialFiltersMatch;
    }
  }

  // Simple cases for single filters
  // Check for user ID filter (starts with #)
  if (pattern.startsWith('#') && !pattern.startsWith('##') && !pattern.startsWith('#!#')) {
    const userIdPattern = pattern.substring(1);
    return userIdMatchesPattern(comment, userIdPattern);
  }

  // Check for display name filter (starts with ##)
  if (pattern.startsWith('##')) {
    const displayNamePattern = pattern.substring(2);
    return displayNameMatchesPattern(comment, displayNamePattern);
  }

  // Check for role filter (starts with #!#)
  if (pattern.startsWith('#!#')) {
    const rolePattern = pattern.substring(3);
    return userHasRole(comment, rolePattern);
  }

  // Regular content matching
  return matchesPattern(getCommentSearchText(comment), pattern);
};
