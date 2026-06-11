// MathJax v3 configuration matching 4chan's /sci/ setup: [math] inline and [eqn] display
// delimiters only, left-aligned display equations, Safe mode, and shitposting-prone macros
// (\color, \newcommand, \def, ...) neutered into no-ops so they silently do nothing.
// Must run before the MathJax component modules are imported.

// Font files are emitted under <base>/mathjax/woff-v2/ by the vite plugin (see vite.config.js),
// resolved like the Ruffle runtime so it works in dev, web builds, and Electron.
const fontURL = new URL('mathjax/woff-v2', document.baseURI).href;

(window as unknown as { MathJax: object }).MathJax = {
  loader: { load: [] },
  startup: { typeset: false },
  tex: {
    // configmacros provides the `macros` option used to neuter the disallowed macros below
    packages: ['base', 'ams', 'noerrors', 'noundefined', 'configmacros'],
    inlineMath: [['[math]', '[/math]']],
    displayMath: [['[eqn]', '[/eqn]']],
    processEscapes: false,
    processEnvironments: false,
    processRefs: false,
    macros: {
      color: '{}',
      newcommand: '{}',
      renewcommand: '{}',
      newenvironment: '{}',
      renewenvironment: '{}',
      def: '{}',
      let: '{}',
    },
  },
  chtml: {
    fontURL,
    displayAlign: 'left',
  },
  options: {
    enableMenu: true,
    safeOptions: {
      allow: {
        URLs: 'none',
        classes: 'none',
        cssIDs: 'none',
        styles: 'none',
      },
    },
  },
};
