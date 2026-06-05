/**
 * Self-contained, language-agnostic syntax highlighter that mirrors the token
 * classes 4chan emits for [code] blocks via Google Code Prettify
 * (https://github.com/googlearchive/code-prettify): a generic lexer that splits
 * source into plain text, strings, comments, numbers, keywords and punctuation.
 *
 * We replicate Prettify's class names (`pln`/`str`/`kwd`/`com`/`lit`/`pun`) so the
 * theme CSS can colour tokens the same way the default `prettify.css` palette does,
 * without pulling in the archived library or running DOM mutation / dangerouslySetInnerHTML.
 *
 * Like Prettify's no-language lexer, keyword matching uses the union of common
 * language keywords, which is why words such as `select` or `string` highlight as
 * keywords regardless of the snippet's actual language.
 */

export type CodeTokenClass = 'pln' | 'str' | 'kwd' | 'com' | 'lit' | 'pun';

export interface CodeToken {
  cls: CodeTokenClass;
  value: string;
  /** Start offset of the token in the source, usable as a stable React key. */
  start: number;
}

// Union of keywords across common languages seen on /g/ (C/C++, Java, C#, JS/TS,
// Python, Ruby, Go, Rust, PHP, shell, SQL). Matches Prettify's "all keywords" behaviour.
const KEYWORDS = new Set<string>([
  // control flow
  'if',
  'else',
  'elif',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'default',
  'break',
  'continue',
  'return',
  'goto',
  'yield',
  'await',
  'async',
  // declarations / structure
  'var',
  'let',
  'const',
  'function',
  'func',
  'fn',
  'def',
  'lambda',
  'class',
  'struct',
  'enum',
  'interface',
  'trait',
  'impl',
  'type',
  'typedef',
  'union',
  'template',
  'typename',
  'namespace',
  'module',
  'package',
  'mod',
  'crate',
  'import',
  'export',
  'from',
  'require',
  'include',
  'using',
  'use',
  'extends',
  'implements',
  'public',
  'private',
  'protected',
  'static',
  'final',
  'abstract',
  'virtual',
  'override',
  'readonly',
  'volatile',
  'register',
  'inline',
  'extern',
  'explicit',
  'friend',
  'mutable',
  'constexpr',
  'decltype',
  'operator',
  'pub',
  // values / types
  'true',
  'false',
  'null',
  'nil',
  'none',
  'undefined',
  'void',
  'int',
  'long',
  'short',
  'char',
  'float',
  'double',
  'bool',
  'boolean',
  'string',
  'str',
  'byte',
  'unsigned',
  'signed',
  'auto',
  'new',
  'delete',
  'this',
  'self',
  'super',
  'sizeof',
  'typeof',
  'instanceof',
  'in',
  'is',
  'as',
  'of',
  // exceptions
  'try',
  'catch',
  'finally',
  'throw',
  'throws',
  'raise',
  'except',
  'ensure',
  'rescue',
  // python / ruby
  'and',
  'or',
  'not',
  'pass',
  'with',
  'global',
  'nonlocal',
  'del',
  'then',
  'end',
  'begin',
  'unless',
  'until',
  'when',
  'redo',
  'retry',
  // go / rust / misc
  'go',
  'defer',
  'chan',
  'select',
  'map',
  'range',
  'make',
  'mut',
  'match',
  'where',
  'move',
  'ref',
  'loop',
  'unsafe',
  'nullptr',
]);

const WHITESPACE_RE = /^\s+/;
const BLOCK_COMMENT_RE = /^\/\*[\s\S]*?(?:\*\/|$)/;
const LINE_COMMENT_RE = /^\/\/[^\n]*/;
// Hash comment only when followed by whitespace, so CSS hex colours (#fff) and
// preprocessor/anchors (#include, #foo) are not swallowed as comments.
const HASH_COMMENT_RE = /^#[ \t][^\n]*/;
const DQUOTE_STRING_RE = /^"(?:\\[\s\S]|[^"\\\n])*(?:"|$)/;
const SQUOTE_STRING_RE = /^'(?:\\[\s\S]|[^'\\\n])*(?:'|$)/;
const TEMPLATE_STRING_RE = /^`(?:\\[\s\S]|[^`\\])*(?:`|$)/;
// Numbers with optional CSS unit / numeric suffix (100ms, 20px, 0xFF, 1.5e3, 100%).
const NUMBER_RE = /^(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)[a-zA-Z%]*/;
const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*/;
// Runs of punctuation, excluding the chars that start the rules above (/ " ' ` # \ $).
const PUNCTUATION_RE = /^[-!%&()*+,.:;<=>?@^{|}~[\]]+/;
const FALLBACK_PUNCTUATION_RE = /[/#\\]/;

/**
 * Tokenize source code into Prettify-style classified tokens. Adjacent tokens of the
 * same class are merged (matching Prettify's plain-run grouping) to keep the DOM small.
 */
export const highlightCode = (source: string): CodeToken[] => {
  const tokens: CodeToken[] = [];

  const push = (cls: CodeTokenClass, value: string, start: number) => {
    if (!value) return;
    const last = tokens[tokens.length - 1];
    if (last && last.cls === cls) {
      last.value += value;
    } else {
      tokens.push({ cls, value, start });
    }
  };

  let index = 0;
  while (index < source.length) {
    const start = index;
    const rest = source.slice(index);
    let match: RegExpExecArray | null;

    if ((match = WHITESPACE_RE.exec(rest))) {
      push('pln', match[0], start);
    } else if ((match = BLOCK_COMMENT_RE.exec(rest)) || (match = LINE_COMMENT_RE.exec(rest)) || (match = HASH_COMMENT_RE.exec(rest))) {
      push('com', match[0], start);
    } else if ((match = DQUOTE_STRING_RE.exec(rest)) || (match = SQUOTE_STRING_RE.exec(rest)) || (match = TEMPLATE_STRING_RE.exec(rest))) {
      push('str', match[0], start);
    } else if ((match = NUMBER_RE.exec(rest))) {
      push('lit', match[0], start);
    } else if ((match = IDENTIFIER_RE.exec(rest))) {
      push(KEYWORDS.has(match[0]) ? 'kwd' : 'pln', match[0], start);
    } else if ((match = PUNCTUATION_RE.exec(rest))) {
      push('pun', match[0], start);
    } else {
      const char = rest[0];
      push(FALLBACK_PUNCTUATION_RE.test(char) ? 'pun' : 'pln', char, start);
    }

    index += match ? match[0].length : 1;
  }

  return tokens;
};
