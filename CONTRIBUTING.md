# Contributing to Matemostri

## Running the tests

There is no build step and no dependencies to install. From the repository root:

```sh
node tests/arithmetic-model.test.js
```

The suite prints `Arithmetic model tests passed.` and exits `0` on success; any
failed assertion throws and exits non-zero. Run it before every commit that
touches `index.html`.

The tests read `index.html` as text, extract individual functions (`buildColumn`,
`commitColumnStep`, `buildLongMultiplication`, `migrateV3StageProgress`, …) plus
the `MATH_STAGES` array, and execute them in a `node:vm` sandbox with a stub DOM.
That means renaming or reshaping those functions, or changing their declaration
style, breaks the tests even when the app still works in a browser — keep them as
top-level `function name(...) {...}` declarations and update the test file
alongside any intentional rename.

## `index.html` is the whole app

The entire application — markup, CSS, and JavaScript — lives in the single
`index.html` file. It has no `<script src>` or `<link href>` tags, no bundler, no
package manager, and no CDN dependencies. The file can be opened directly from
disk or served as a lone static file and it just works.

Keep it that way. Changes must not:

- split code into separate `.js` or `.css` files, or add `import`/`require` to
  the app,
- reference an external script, stylesheet, font, or library over the network,
- introduce a build, transpile, or bundling step.

New styles go in the existing `<style>` block, new logic in the existing
`<script>` block.

The only exception is `assets/` — image files referenced by path (monster stages,
story panels, UI art). Every one of them is optional at runtime: each `<img>`
carries an `onerror` handler that hides it and reveals the inline SVG fallback, so
the app stays fully playable with `assets/` missing entirely. Never make a code
path depend on an asset file loading successfully. See `assets/monsters/README.md`
for how to promote new artwork via `stages.json` and the `assetReady` flag.
