import { describe, expect, it } from 'vitest';
import {
  getCommentFlagOptionsForDirectory,
  getCommentFlagPublishOptionsForDirectory,
  getCommentFlagPublishOptionsFromSelection,
  getCommentFlagRequestFromSelection,
  hasCommentFlagsForDirectory,
} from '../comment-flag-selection';

describe('comment-flag-selection', () => {
  it('does not expose options for boards without flags', () => {
    expect(getCommentFlagOptionsForDirectory({ features: {}, title: '/mu/ - Music' })).toEqual([]);
  });

  it('detects flag-capable directories from directory metadata', () => {
    expect(hasCommentFlagsForDirectory({ features: {}, title: '/mu/ - Music' })).toBe(false);
    expect(hasCommentFlagsForDirectory({ features: { hasFlags: true }, title: '/pol/ - Politically Incorrect' })).toBe(true);
  });

  it('uses geographic location as the default for other flag boards', () => {
    expect(
      getCommentFlagOptionsForDirectory({
        directoryCode: 'fit',
        features: { hasFlags: true },
        title: '/fit/ - Fitness',
      }),
    ).toEqual([{ label: 'Geographic Location', value: 'country:auto' }]);
  });

  it.each([
    { directoryCode: 'bant', title: '/bant/ - International/Random' },
    { directoryCode: 'int', title: '/int/ - International' },
    { directoryCode: 'sp', title: '/sp/ - Sports' },
  ])('does not expose a flag selector on /$directoryCode/ but still publishes geographic location', ({ directoryCode, title }) => {
    expect(
      getCommentFlagOptionsForDirectory({
        directoryCode,
        features: { hasFlags: true },
        title,
      }),
    ).toEqual([]);

    expect(
      getCommentFlagPublishOptionsForDirectory({
        directoryCode,
        features: { hasFlags: true },
        title,
      }),
    ).toEqual({
      challengeRequest: {
        challengeAnswers: ['bitsocial-flags:5chan:flag:country:auto'],
      },
      flairs: [{ type: 'country', code: 'auto', text: 'flag:country:auto' }],
    });
  });

  it('matches the 4chan /pol/ flag order', () => {
    const options = getCommentFlagOptionsForDirectory({
      directoryCode: 'pol',
      features: { hasFlags: true },
      title: '/pol/ - Politically Incorrect',
    });

    expect(options.slice(0, 6)).toEqual([
      { label: 'Geographic Location', value: 'country:auto' },
      { label: 'Anarcho-Capitalist', value: 'pol:AC' },
      { label: 'Anarchist', value: 'pol:AN' },
      { label: 'Black Nationalist', value: 'pol:BL' },
      { label: 'Confederate', value: 'pol:CF' },
      { label: 'Communist', value: 'pol:CM' },
    ]);
    expect(options.slice(-6)).toEqual([
      { label: 'Republican', value: 'pol:RE' },
      { label: 'Task Force Z', value: 'pol:MZ' },
      { label: 'Templar', value: 'pol:TM' },
      { label: 'Tree Hugger', value: 'pol:TR' },
      { label: 'United Nations', value: 'pol:UN' },
      { label: 'White Supremacist', value: 'pol:WP' },
    ]);
  });

  it('matches the 4chan /mlp/ flag default', () => {
    const options = getCommentFlagOptionsForDirectory({
      directoryCode: 'mlp',
      features: { hasFlags: true },
      title: '/mlp/ - Pony',
    });

    expect(options.slice(0, 4)).toEqual([
      { label: 'None', value: 'none' },
      { label: '4cc /mlp/', value: 'pony:4CC' },
      { label: 'Adagio Dazzle', value: 'pony:ADA' },
      { label: 'Anon', value: 'pony:AN' },
    ]);
  });

  it('falls back to the board title when directoryCode is blank', () => {
    const options = getCommentFlagOptionsForDirectory({
      directoryCode: ' ',
      features: { hasFlags: true },
      title: '/mlp/ - Pony',
    });

    expect(options.slice(0, 2)).toEqual([
      { label: 'None', value: 'none' },
      { label: '4cc /mlp/', value: 'pony:4CC' },
    ]);
  });

  it('serializes selected flags as challenge-readable flag requests', () => {
    expect(getCommentFlagRequestFromSelection('country:auto')).toEqual({
      type: 'country',
      code: 'auto',
      text: 'flag:country:auto',
    });
    expect(getCommentFlagRequestFromSelection('pol:AC')).toEqual({
      type: 'pol',
      code: 'AC',
      text: 'flag:pol:AC',
    });
    expect(getCommentFlagRequestFromSelection('pony:AJ')).toEqual({
      type: 'pony',
      code: 'AJ',
      text: 'flag:pony:AJ',
    });
    expect(getCommentFlagRequestFromSelection('none')).toBeUndefined();
  });

  it('publishes selected flags as signed comment flairs and challenge answers', () => {
    expect(getCommentFlagPublishOptionsFromSelection('country:auto')).toEqual({
      challengeRequest: {
        challengeAnswers: ['bitsocial-flags:5chan:flag:country:auto'],
      },
      flairs: [{ type: 'country', code: 'auto', text: 'flag:country:auto' }],
    });
    expect(getCommentFlagPublishOptionsFromSelection('pony:AJ')).toEqual({
      challengeRequest: {
        challengeAnswers: ['bitsocial-flags:5chan:flag:pony:AJ'],
      },
      flairs: [{ type: 'pony', code: 'AJ', text: 'flag:pony:AJ' }],
    });
  });

  it('clears flag publish data when no flag is selected', () => {
    expect(getCommentFlagPublishOptionsFromSelection('none')).toEqual({
      challengeRequest: undefined,
      flairs: undefined,
    });
    expect(getCommentFlagPublishOptionsFromSelection(undefined)).toEqual({
      challengeRequest: undefined,
      flairs: undefined,
    });
  });
});
