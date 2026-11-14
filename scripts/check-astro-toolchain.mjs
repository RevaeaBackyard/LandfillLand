import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const projectRequire = createRequire(new URL('../package.json', import.meta.url))
const checkerEntry = projectRequire.resolve('@astrojs/check')
const checkerRequire = createRequire(checkerEntry)
const languageServerRequire = createRequire(checkerRequire.resolve('@astrojs/language-server'))

// Exercise the checker's actual WASM dependency graph. A mixed emnapi 1.x core
// and 2.x runtime otherwise appears as a misleading missing-checker error.
const { convertToTsx } = await import(pathToFileURL(languageServerRequire.resolve('@astrojs/astro2tsx')).href)
const { check, parseArgsAsCheckConfig } = await import(pathToFileURL(checkerEntry).href)
assert.equal(typeof check, 'function')
assert.equal(typeof parseArgsAsCheckConfig, 'function')

const source = `---
const title: string = 'Dependency check'
---
<main><h1>{title}</h1></main>
`
const result = convertToTsx(source, { filename: 'DependencyCheck.astro' })
assert.equal(result.hasParseErrors, false)
assert.ok(result.code.includes('Dependency check'))
assert.ok(result.code.includes('<h1>{title}</h1>'))
assert.ok(result.mappings.length > 0, 'Type-checking output must retain source mappings')
console.log('Astro checker imports and its WASM-backed Astro-to-TSX conversion pass')
