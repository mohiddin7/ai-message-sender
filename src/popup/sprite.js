// Shared icon sprite. Inlined into the DOM by popup.js, options.js, and
// welcome.js so <svg><use href="#i-..."/></svg> resolves. See src/lib/ui-icons.html
// for the full set of icons.
//
// Note: this file is read as a string at runtime by esbuild (via a side
// effect — esbuild can't bundle raw .html). To keep things simple, we
// import the sprite as a ?raw asset.

import spriteHtml from "../lib/ui-icons.html?raw";

export const SPRITE_HTML = spriteHtml;
