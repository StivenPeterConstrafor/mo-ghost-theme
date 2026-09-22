# Scripture citations and edition identity

Prepared from Ian’s upstream main, 2706e48ab. This branch changes the theme only; no Worker or corpus objects were changed and no upstream PR or production theme deployment was made.

## Behavior

- All-citation and filtered sidebar lists start closed, grouped by author and then work. Readers can switch to work grouping or sort by name, century, or loaded citation count. Work titles and volume numbers sort naturally; opaque source-page IDs remain strings.
- Loading another citation page keeps the existing open groups and actual passage previews. Counts explicitly distinguish loaded records from the API total.
- Indexed page summaries are labelled. Only the canonical passage returned by the existing verse Worker is shown as a quotation. An unavailable preview gets a real retry button and a read-in-context link. Aggregate work totals cannot be previewed without resolving a real source location.
- Library cards, author/collection rows, title-search results, and Scripture source headings show published volume/part, extent, format, and edition/witness metadata.
- The catalogue keeps explicit edition/complementary-witness records even when the older duplicate fold includes them. True repeated imports still fold. Withdrawn works remain excluded.
- Pétau’s five born-digital parts and seven facsimile volumes stay as two editions, with their independent numbering and section/page counts. Gerhard Book I’s recorded twin is distinguished from broad related editions of the series; Book II is not falsely labelled a one-to-one second witness.

## Data and boundaries

The existing Cloudflare library endpoint supplies works-index, workgroups, and work-relations. No Vercel, Blob, OpenRouter, or new generation request is introduced. The pure scripture-source-groups.js helper is mirrored in the Vercel integration.

## Verification

- Four regression tests cover natural volume order, exact page IDs, distinct witnesses, Gerhard metadata, Pétau’s 5+7 sets, and repeat-ingestion folding.
- Theme build, lint and build:check pass; built CSS and changed asset URL versions are included.
- Browser, using the edited local theme assets and live verse API: Matthew 1:22 starts with all author/work groups closed; Calov’s p. 54 opens a canonical English quotation separately from its indexed summary; pagination from 20 to 40 of 299 preserves the open groups and quotation.
- A separate local regression fixture renders the edited card functions against real published Pétau/Gerhard metadata. It verifies both edition choices, all volume labels and extents, and no horizontal overflow. This fixture is not a production page.
- The main catalogue request failed in the local preview, so full live catalogue-label read-back should be checked on Ian’s deployed origin after merge. The citation Worker preview was verified live.

## Delivery

Owner-fork branch: fix/scripture-citation-groups. Merge/deploy through Ian’s normal theme workflow. This branch does not replace the separate Cloudflare-only runtime deployment handoff; those Worker changes still need their own rollout status checked.


## Preview and edition follow-up, 22 September 2026

Preview now opens the canonical reader in a bounded frame with an Open full reader link and Close preview control. The chapter commentary strip owns one full-width reader below the strip; it never mounts inside the 240px card. Citation previews keep their exact indexed work/location, and top-work summaries first resolve a real citation. The existing reader's `mo-embedded` mode hides the outer site chrome. The older Bible page now mounts its preview below the complete work row rather than the 180px action column.

The shared Scripture ordering helper keeps editions separate and orders numeric and Roman-numbered volumes within each format. Known born-digital editions come before their facsimiles. Commentary cards and citation groups show published volume, edition and witness labels; unknown relationships are not called second witnesses. No catalogue content, worker, storage endpoint, or API changed.

Validation: seven edition/grouping regressions passed, including Pétau and Gerhard; theme lint and the full build passed. The isolated theme preview loaded 78 real Matthew 1 commentary entries and opened a full-width mini-reader container beneath the strip. The local cross-origin reader frame itself could not be verified as populated, so this remains a same-origin live check after Ian merges. Vercel's same-origin implementation was verified with Aquinas at desktop and 390px, in light and dark themes, without horizontal overflow.
