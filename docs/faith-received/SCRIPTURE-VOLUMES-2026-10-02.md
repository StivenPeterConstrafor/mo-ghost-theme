# Scripture: a set's volumes are named and stand in order (2026-10-02)

## What a reader saw

The verse index names a work by its title alone. On the Verse Desk, under an author, the volumes of one set were therefore
cards with the same words on them, in the order of their addresses read as text. Romans 3:28, Abraham Calov, before:

```
Biblia Novi Testamenti Illustrata · 2 pages      System of Theological Topics · 4 pages
Biblia Novi Testamenti Illustrata · 7 pages      System of Theological Topics · 12 pages
System of Theological Topics · 1 page            System of Theological Topics · 3 pages
Socinismus Profligatus · 5 pages                 Biblia Novi Testamenti Illustrata · 9 pages   …
```

Six cards read "System of Theological Topics" and nothing said which volume each was (they were vol. 1, 10, 12, 9, 5–6, 7, 8).

## What changed

- Each card, each source row and the open panel's heading carry the volume's published label from the catalogue
  (`v1/works-index.json`, field `volume`): "Vol. 10", "Vol. 2, Part 1", "Tomus II". After:

```
Biblia Novi Testamenti Illustrata · Vol. 1          System of Theological Topics · Vol. 1
Biblia Novi Testamenti Illustrata · Vol. 2, Part 1  System of Theological Topics · Vol. 5–6
Biblia Novi Testamenti Illustrata · Vol. 2, Part 2  System of Theological Topics · Vol. 7 … Vol. 12
Socinismus Profligatus
```

- Under an author, works stand by title, then by volume read as a number (2 before 10, II before IV, IX after V).
- "Most-cited sources" and every other list built from `sourceItem` (the Scripture reader's verse panel, Topics) show the
  same label after the title: *Acta Concilii Tridentini*, Vol. 5.

## Rules

- Only a volume designation is a label: the field must begin with Vol., Volume, Tomus, Tome, Band, Liber, Pars, Part or
  Book. The catalogue's `volume` field also holds series volumes ("PL 35"), years ("1621") and edition notes ("first ed.");
  those are not shown here.
- A label is not repeated beside a title that already carries it ("Opera omnia, Tomus II").
- Nothing is inferred from an address. Without the catalogue (offline, a failed request) the rows read as they did before,
  and the order falls back to the addresses read as numbers.
- The catalogue is fetched once per page, when the first source row is drawn, from the library worker the page already
  uses. No Vercel, Blob or model request is added. On the wire it is 0.74 MB (gzip), the same file the library pages load.

## Files

- `assets/js/page/scripture-source-groups.js`: the ordering helper, byte for byte the file the corpus site ships
  (`FRScriptureSources.compareWorks`). Pure: no requests.
- `assets/js/page/scripture-dev-core.js`: `loadVolumes`, `volumeLabel`, `sortWorks`; `sourceItem` adds the label.
- `assets/js/page/scripture-dev-desk.js`: the author panel sorts its works and labels the cards and the open panel.
- `assets/css/scripture-dev.css`: `.sd-source-vol` (upright, muted, after an italic title).
- `custom-scripture-dev.hbs`, `custom-scripture-dev-desk.hbs`, `custom-faith-topics-dev.hbs`: the helper is loaded before the
  core script on the two Scripture pages; `frv` stamps are the first 16 hex digits of each file's SHA-256.
- `scripts/check-scripture-volumes.cjs`: five tests (`node --test scripts/check-scripture-volumes.cjs`). It is not wired
  into `npm run build`; `package.json` is outside the paths a contributor may change.

## Verification

- `npm run lint`: 0 errors. `npm run build:check`: OK. `node --test` on the two existing Scripture checks and the new one:
  34 of 34 pass.
- Browser: the live Verse Desk page for Romans 3:28 with these four files substituted in the response
  (desktop 1280 px and phone 390 px). Calov's eleven cards read and stand as above, the open panel's heading reads "Biblia
  Novi Testamenti Illustrata, Vol. 1", no horizontal overflow at 390 px, no page errors.

## The branch this replaces

`fix/scripture-citation-groups` (22 September, never opened as a pull request) is superseded. Main already has what it
offered apart from this: citations grouped by author and then by work on the Verse Desk, previews in the reader frame with
retry, and Facsimile or Born-digital labels on library cards. Its ordering helper is the one file carried over.
