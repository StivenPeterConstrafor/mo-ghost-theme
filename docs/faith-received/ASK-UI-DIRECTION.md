# Ask interface, September 2026

Apply the supplied references to the existing conversation engine in both hosts:

- Halaska: https://ui.halaska.com/ — restrained conversation hierarchy, visible research state, source receipts, action and recovery affordances.
- ObsidianUI: https://www.obsidianui.dev/docs/apple-spotlight and https://www.obsidianui.dev/docs/magnet-tabs — keyboard command search and clear selected navigation.
- React Bits: https://reactbits.dev/c/micro — Prompt Bar, Thought Line and Status Mark inform composer feedback, genuine activity indicators and state transitions.

The implementation is original vanilla JavaScript and CSS. It adapts these interaction patterns without adding their React runtimes or changing the API, persistence format, retrieval, citation verification, notebook save path or source-reader ownership.

The task is to ask a question, see what research is happening, read a sourced answer, and inspect a cited work without losing the conversation. Preserve Vercel's monochrome scholarly typography and Ghost's Mere Orthodoxy colors and typography.

The main changes are a compact history rail, readable question and answer hierarchy, a scope-labelled composer, source previews plus a complete list grouped by work, an activity control in the header, and a command palette for saved conversations and existing actions. Work slugs remain edition boundaries; a shared title does not merge witnesses. Counts describe supplied passages, never verified unique historical citations.

Motion is brief feedback on focus, selection and opening controls. Running indicators reflect actual turn state. Reduced-motion users receive no animation. No simulated progress, confidence percentages, decorative cursor effects or fabricated sources.

Check desktop, the owner's 863px viewport, and phone widths; both themes; ordinary and Deep states; saved conversation switching; command filtering and keyboard navigation; scope controls; source preview and back; citations and streamed node stability. The public tunnel remains read-only and is not an end-to-end AI test environment.


## Verification and delivery

- 93 Ask tests passed, including streaming DOM identity, citation integrity, persistence, scope and source navigation. Four new interface tests also passed against the Ghost copy.
- Ghost build and lint passed; generated stylesheet and all asset versions updated.
- Browser checks covered 1280px desktop, 863px tablet and 390px phone layouts; Vercel light/dark themes; Ghost site palette; command filtering, no results, Enter selection and Escape focus return; existing saved conversations; all-source expansion; and an actual bilingual source preview with return to the conversation.
- The browser pass found duplicate Vercel header navigation and an intrusive composer focus outline; both corrected. A static design check flagged a padding transition, which was removed.
- Vercel published through tools/deploy_site.sh. Live alias assets matched the built bytes: ask-workspace.js MD5 7678459b12587aff5e3f15e3e37af40e; ask-workspace.css MD5 bcca743b2ff0324435c1c3432d382411.
- These checks exercised saved answers and the existing research-state model. No new AI answer was submitted as part of the visual review. API and corpus files were not changed.
