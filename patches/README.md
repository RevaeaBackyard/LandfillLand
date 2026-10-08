# Dependency compatibility and security patches

## braces 3.0.3

Local mitigation for GHSA-vfj7-8cjw-p6xm, which has no upstream fixed release as of 2026-10-08. Caps brace/parenthesis nesting at 100 and guards recursive compile, expand and stringify entry points, including directly supplied ASTs. The dependency is used by build-time glob tooling; arbitrary untrusted glob expansion should still be avoided.

Imported from IZCosmos/Cedarflake-Grove commit 875bc046e3f352744e5e6c09a9d42383547aab96. Run `node scripts/check-braces-security.cjs` after installation. The raw registry advisory stays visible because the upstream version is unchanged. Replace this local mitigation when a verified upstream fix becomes available.

## @unocss/transformer-directives 66.10.5

The empty-rule cleanup rewrites already-transformed CSS with MagicString.update(), which preserves previous inserted declaration chunks and duplicates them outside their selectors. Use overwrite() for that full-file replacement so declarations are emitted only once. This fixes malformed CSS rejected by Vite 8's Lightning CSS minifier. Keep the default strict minifier to detect regressions.
