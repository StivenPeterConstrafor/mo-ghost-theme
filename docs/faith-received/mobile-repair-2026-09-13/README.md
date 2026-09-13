# Mobile history focus and Contents repair

The owner supplied iPhone screenshots showing unwanted input zoom and an oversized Contents header. This folder provides full source, a narrow patch and actual Chrome phone-width comparison images. **Local repair; not deployed at this checkpoint.** Final desktop verification was interrupted by browser timeouts. Do not mark the iPhone zoom issue fully resolved from desktop emulation.

## Behavior

Opening Saved questions on touch/narrow layouts focuses the sidebar instead of the search input, so merely navigating to history does not request the keyboard. The sidebar receives `tabindex=-1`; desktop keyboard users still focus search. The history field explicitly uses 16px at every breakpoint. Existing mobile 16px rules were already live; the original iPhone zoom cannot honestly be attributed solely to their absence.

The mobile reader Contents header uses a single clipped title line and compact metadata. Duplicate Library/Authors/Scripture chips hide only if the existing Explore menu is available. The distinct All confessions link is retained. Tabs and toolbar actions remain 44px high; independent expansion buttons remain 48px. No source heading, TEI, row pairing, apparatus content or corpus data changes.

## Apply to the native port

The three complete Vercel originals are `ask-workspace.js.txt`, `ask-workspace.css.txt`, and `reader-contents.css.txt`; hashes are in manifest.json. Apply the narrow changes to the matching port workspace and reader CSS, preserving MereO routes, membership and the current source version. Use mobile-repair.patch as a guide, not a blind replacement of the Ghost theme. Native legacy Ask history from PR12 already avoids automatic input focus; this new workspace change addresses the full port renderer.

Run the normal theme build and commit the built files. Preserve the path guard; protected file edits remain maintainer work. Before merging, verify phone and desktop, light/dark, English-only and bilingual readers, branch expansion and opening an actual section, history open/tap/switch/reload, and keyboard dismissal without horizontal clipping. Test the actual iPhone behavior after release; pinch-to-zoom must remain available. No viewport zoom restrictions are added.

## Evidence

The mobile history check observed ASIDE as activeElement on opening, then 16px for an explicitly tapped search field and 390px panel width. Toolbar/expansion heights measured 44/48px. Pointer and Enter toggled a Contents branch after reader initialization. 25 Ask tests and build secret/script gates passed. The English Baxter work is eebo-26874; bilingual test is pld-212.

| Current Vercel, mobile dark | Local repair, mobile dark |
|---|---|
| ![Before](vercel-mobile-contents-before.jpg) | ![After](vercel-mobile-contents-after.jpg) |

![Local repair in light theme](vercel-mobile-contents-after-light.jpg)

## Artifact update

Add this repair as a dated fold in existing section B, Reader, and cross-reference C, Search and Ask. Keep the existing artifact URL, A–F identities, all existing figures and measured counts. Label images as current Vercel before/local preview after. Do not label the repair deployed until an alias hash check and live acceptance pass. Update the existing change log and surface matrix; rebuild using the supplied HANDOFF_PACK/rebuild.py and verify the same artifact address. The backend audit is in private worker PR4; do not copy detailed security findings or ungated origins into a public artifact.
