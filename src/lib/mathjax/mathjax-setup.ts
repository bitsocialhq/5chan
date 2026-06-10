// Custom MathJax v3 component build (the official "making a custom build" recipe for bundlers):
// the config module must execute first, then the components, then startup wires everything up.
// Imported lazily (dynamic import) so MathJax stays out of the main bundle and only loads on
// math-enabled boards that actually display equations.
import './mathjax-config';
import 'mathjax-full/components/src/startup/lib/startup.js';
import 'mathjax-full/components/src/core/core.js';
import 'mathjax-full/components/src/input/tex-base/tex-base.js';
import 'mathjax-full/components/src/input/tex/extensions/ams/ams.js';
import 'mathjax-full/components/src/input/tex/extensions/configmacros/configmacros.js';
import 'mathjax-full/components/src/input/tex/extensions/noerrors/noerrors.js';
import 'mathjax-full/components/src/input/tex/extensions/noundefined/noundefined.js';
import 'mathjax-full/components/src/output/chtml/chtml.js';
import 'mathjax-full/components/src/output/chtml/fonts/tex/tex.js';
import 'mathjax-full/components/src/ui/safe/safe.js';
import 'mathjax-full/components/src/ui/menu/menu.js';
import 'mathjax-full/components/src/a11y/assistive-mml/assistive-mml.js';
import 'mathjax-full/components/src/startup/startup.js';
