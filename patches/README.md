# Dependency compatibility and security patches

## Astro type-checker runtime

The lockfile uses the upstream `@astrojs/astro2tsx` 0.1.4 fix, which declares `@emnapi/runtime` 1.11.3 alongside its matching core. Version 0.1.3 omitted the runtime dependency, allowing an unrelated 2.0 beta peer to enter the checker graph. The resulting WASM initialization failure was reported by `astro check` as a missing `@astrojs/check` installation.

Run `node scripts/check-astro-toolchain.mjs` after installation. It imports the actual checker dependency graph and converts a typed Astro fixture to TSX with source mappings. CI runs this in both clean and cached-upgrade installations, followed by the full type check and build. No local package patch or type-check bypass is used.

## braces 3.0.3

Local mitigation for GHSA-vfj7-8cjw-p6xm, which has no upstream fixed release as of 2026-10-08. Caps brace/parenthesis nesting at 100 and guards recursive compile, expand and stringify entry points, including directly supplied ASTs. The dependency is used by build-time glob tooling; arbitrary untrusted glob expansion should still be avoided.

Imported from IZCosmos/Cedarflake-Grove commit 875bc046e3f352744e5e6c09a9d42383547aab96. Run `node scripts/check-braces-security.cjs` after installation. The raw registry advisory stays visible because the upstream version is unchanged. Replace this local mitigation when a verified upstream fix becomes available.

## @unocss/transformer-directives

The former 66.10.5 patch replaced MagicString.update() with overwrite() during empty-rule cleanup to avoid duplicated declarations outside their selectors. UnoCSS 66.11.0 includes that fix upstream, so the version-specific patch has been removed. Keep the default strict Lightning CSS minifier and site smoke checks to detect regressions.
