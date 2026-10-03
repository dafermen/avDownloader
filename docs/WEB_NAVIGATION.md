# Documentation web navigation v1

Date: 2026-10-03. Scope: documentation reading and navigation requested by the owner.

## Visual identity and maintenance

The documentation uses the InnovaLogic family: blue `#2563eb`, cyan `#0ea5e9`, neutral reading surfaces and a dark alternative. The project keeps its name and existing routes. Application screens retain their own styling.

Theme source: `public/innovalogic-docs.css`. Adjust the `--docs-accent` and related tokens for a future brand revision; check both themes and contrast. Do not edit generated files as the source of truth. Reading tools are local assets; no CDN or tracking is introduced.

## Reader experience

Three entry paths cover discovery, use and development. Existing navigation and search are retained or improved. Code can be copied with a keyboard-accessible control. Images can be enlarged when the document contains them; Escape closes the image dialog. Mobile navigation, visible focus and reduced-motion preferences are part of the review.

## Recorded validation

55 tests PASS; documentation JavaScript syntax PASS; browser at 1440 and 390 px PASS. No media provider or paid API calls.

This is a local candidate. GitHub publication and server delivery have not occurred for this navigation revision. Previous product limitations, access rules, portfolio exclusions and deployment gates remain in effect.

## Next action

Complete any pending checks, review the focused diff, then publish only the validated candidate through the project's existing delivery procedure. Keep prior artifacts available for rollback.
