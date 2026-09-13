# vosk.js — third-party, unmodified

`extension/vosk.js` is not written here and is not minified by this project.
It is the published distribution file of the `vosk-browser` npm package,
copied in byte for byte so the extension never has to run code it did not
ship — which Manifest V3 forbids, and rightly.

| | |
|---|---|
| Package | [`vosk-browser`](https://www.npmjs.com/package/vosk-browser) 0.0.8 |
| File | `dist/vosk.js` from the registry tarball |
| Source | <https://github.com/ccoreilly/vosk-browser> |
| Upstream engine | [Vosk](https://alphacephei.com/vosk/) / Kaldi |
| Licence | Apache-2.0 |
| SHA-256 | `29504515526e974f4cb053cf08811c4de5fb2a74007c0a5a957db50eaa8d5d0c` |

To verify or refresh it:

```sh
npm pack vosk-browser@0.0.8
tar xzf vosk-browser-0.0.8.tgz package/dist/vosk.js
shasum -a 256 package/dist/vosk.js      # must match the row above
cp package/dist/vosk.js extension/vosk.js
```

It is large (5.8 MB) because the WebAssembly build is inlined into the file as
base64. That is the upstream packaging, not a choice made here.

**For add-on reviewers:** this file is a published library, obtainable from the
registry with the command above, and byte-identical to it. It is **not** loaded
on any page by default — it is a `web_accessible_resource`, imported only when
the user presses Dictate. The language model it uses is a separate ~40 MB
download that the user is asked about first; it is never bundled.
