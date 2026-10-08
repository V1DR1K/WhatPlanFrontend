# Whither Journey

## Authority and disposition

Ordinary extension of the coherent incumbent WhatPlan system. Product authority: `PRODUCT.md`; incumbent guidance: `MANUAL_DE_MARCA.md`, shared shell and UI components, and `src/lib/sectionTheme.ts`. User-pinned direction: cyan travel/plane module, catalog and trip detail with overview followed by Agenda, Archivos, Estadías, Valijas and Dinero. The code supplies the pinned structure; no new visual-world workshop or redesign is needed.

Review disposition supplied by the orchestrator: **ship**, at the sole fix-verdict scope. The completed correction routes draft closing through shared `Modal`; redundant form cancellation was removed. The existing shared implementation owns dirty-form confirmation and pending-save close prevention. This documentation handoff makes no implementation, test, configuration, backend or review-artifact changes.

## Surface brief

- **Catalog:** plane cue, Spanish introduction and create action; route/date cards lead to a trip. Preserve loading/error/empty states and pagination. Two columns become one on narrow screens.
- **Public presentation at `/`:** show WhitherJourney as the sixth chapter, with the approved cyan and airplane cue. Its illustrative trip view makes destinations, daily agenda, stays, packing and currency-separated expenses visible; keep the scene labelled as illustrative.
- **Detail overview:** trip name and dates, destination stages, completed agenda count/progress, balances for each currency and member reviews precede the five panels. A destination filters the working context without losing trip-level orientation.
- **Agenda:** daily ordered route; timing, destination, status, optional linked catalog record and actions sit beside a circular marker. Completed markers use the local arrival animation: scale 0.85 to 1 and blur 1 px to 0 over 0.4 s, with the existing arrival easing. Reduced motion disables animation and transitions. Up/down buttons support ordering by keyboard without requiring drag gestures.
- **Archivos:** private original PDFs and images linked to the trip, stage, point, stay or movement. Authenticated media becomes a temporary blob URL; images open in shared `PhotoViewer`; PDFs use the browser-native iframe viewer with page/zoom and original download fallback. Native PDF rendering varies by browser.
- **Estadías:** destination/date, address, booking source/link, price with currency, optional photos and member reviews; use existing photo/review controls.
- **Valijas:** separate packing lists and progress for each member; quantity, checked state and edit/remove actions stay attached to the correct person.
- **Dinero:** funds minus expenses plus reimbursements, kept separately for each currency. Display stage breakdown and movement links without introducing exchange conversion.

## System fit and local choices

Preserve the incumbent dark canvas, header/navigation, rounded physical buttons, common modal, photo viewer and ratings. Journey adds the approved theme entry: accent `#83d8f5`, contrast `#102b38`, shadow `#245c73`, surface `#18323e`, soft surface `#12232d`. Its pale foreground `#e4f6ff`, secondary `#b9dce9` and outlined plane are scoped to this module.

The implementation uses DM Sans for its own page and panel headings rather than the Fraunces heroes common elsewhere. This is an observed choice in the pinned structure, recorded locally; it does not replace the incumbent typography rules. The 1160 px internal width, two-column catalog/packing layout, route markers and five-tab sequence are surface-specific.

Responsive evidence shows a single-column overview, wrapped tabs and action rows, stacked stays/currency summaries and scrollable modal content. The shared close control remains outside scrolling form content. Keep keyboard tab semantics, visible focus, labelled reorder buttons and reduced-motion behavior.

## Evidence checked

Documentation scan on 2026-10-03 inspected `PRODUCT.md`, the existing brand manual, `src/main.tsx` import order, `sectionTheme.ts`, shared Button/SectionShell/Modal and stylesheet sources, journey catalog/detail/editors/files, and existing journey browser-test assertions. No browser session, screenshot capture, detector run or test run was started by the documenter.

All ten saved review screenshots were opened and visually checked:

| Panel/state | Desktop | Mobile |
| --- | --- | --- |
| Agenda / overview | `../review/desktop.png` | `../review/mobile.png` |
| Estadías | `../review/desktop-Estadías.png` | `../review/mobile-Estadías.png` |
| Valijas | `../review/desktop-Valijas.png` | `../review/mobile-Valijas.png` |
| Dinero | `../review/desktop-Dinero.png` | `../review/mobile-Dinero.png` |
| Edit trip dialog | `../review/desktop-form.png` | `../review/mobile-form.png` |

The screenshot-producing test uses desktop 1440×1000 and mobile 390×844 with reduced motion. Full-page captures show the overview and working panel. The mobile form capture shows the bounded dialog while lower form content is reached by scrolling; it does not show every field at once. No dedicated catalog or Archivos screenshot exists in this ten-image set, so those surfaces were checked in code, not asserted as screenshot-reviewed.

Existing `.impeccable/review/detector.json` contains `[]`. Existing `test-results/.last-run.json` reports `passed` and no failed tests. The browser-test source covers organizing trips at two viewport widths, PDF page/zoom, no horizontal overflow, tab arrow navigation, reduced-motion marker animation, dirty-draft confirmation/continue editing, and blocking Escape/close while saving. These are existing evidence, not newly executed checks or a claim of exhaustive coverage.

## Comparison and drift

Compared working sources against incumbent Git HEAD `cf918d9`. Shared styles and `src/components/ui` have no tracked diff; the theme change adds the journey entry and section type only, leaving incumbent theme entries intact. Screenshot colors, header, action shadows, modal and ratings agree with that shared foundation.

Pre-existing drift remains: the brand manual calls the film/cooking modules WhichMovie/WhoCook, while current routes/components use WhichFilm/HowCook; the manual's film hero background `#201C35` differs from the incumbent theme surface `#29243c`. Base and global styles repeat some definitions and later imported files refine typography, modal dimensions and controls; this scan records the actual cascade rather than treating an earlier declaration as the final rendered rule. None of this was repaired or reinterpreted as a redesign requirement.

No DESIGN.md or `.impeccable/design.json` existed at handoff. The document reference explicitly requires scan mode for a coherent incumbent with missing baseline. New root DESIGN.md and schema-v2 sidecar therefore capture existing reusable tokens and approved journey additions. Their values describe implementation; they do not introduce runtime tokens or authorize new styling. The trip composition and local signature remain here. Existing system files and review artifacts are preserved.
