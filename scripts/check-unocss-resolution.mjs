import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const project = resolve(process.argv[2] ?? '.')
const projectRequire = createRequire(join(project, 'package.json'))
const unocssRequire = createRequire(projectRequire.resolve('unocss'))
const astroRequire = createRequire(unocssRequire.resolve('@unocss/astro'))
const viteRequire = createRequire(astroRequire.resolve('@unocss/vite'))
const inspectorRequire = createRequire(viteRequire.resolve('@unocss/inspector'))
const autocompleteEntry = inspectorRequire.resolve('@unocss/autocomplete')
const autocompleteRoot = resolve(dirname(autocompleteEntry), '..')
const manifest = JSON.parse(await readFile(join(autocompleteRoot, 'package.json'), 'utf8'))
const fixturePrefix = join(resolve(tmpdir()), 'landfill-unocss-')
const fixture = await mkdtemp(fixturePrefix)

try {
  const modules = join(fixture, 'node_modules')
  const isolatedAutocomplete = join(modules, '@unocss', 'autocomplete')
  await mkdir(dirname(isolatedAutocomplete), { recursive: true })
  await cp(autocompleteRoot, isolatedAutocomplete, { recursive: true })

  // Copy only this package's direct runtime links. Hidden pnpm hoists must not
  // conceal the published 66.11.0 package's missing @unocss/core declaration.
  const dependencies = new Set([...Object.keys(manifest.dependencies ?? {}), '@unocss/core'])
  for (const dependency of dependencies) {
    const directLink = resolve(autocompleteRoot, '..', '..', dependency)
    let target
    try {
      target = await realpath(directLink)
    }
    catch (error) {
      if (error.code !== 'ENOENT')
        throw error
      console.log(`Missing direct runtime dependency: ${manifest.name} -> ${dependency}`)
      continue
    }
    const destination = join(modules, dependency)
    await mkdir(dirname(destination), { recursive: true })
    await symlink(target, destination, process.platform === 'win32' ? 'junction' : 'dir')
  }

  const { createAutocomplete } = await import(pathToFileURL(join(isolatedAutocomplete, 'dist/index.mjs')).href)
  const isolatedRequire = createRequire(join(isolatedAutocomplete, 'package.json'))
  const { createGenerator } = await import(pathToFileURL(isolatedRequire.resolve('@unocss/core')).href)
  const uno = await createGenerator({ rules: [['dependency-probe', { color: 'red' }]] })
  const suggestions = await createAutocomplete(uno).suggest('dependency-')
  assert.ok(suggestions.includes('dependency-probe'), 'Isolated autocomplete must produce suggestions')
  console.log(`UnoCSS ${manifest.version}: direct runtime dependencies resolve without hidden hoists; autocomplete passes`)
}
finally {
  assert.ok(fixture.startsWith(fixturePrefix) && dirname(fixture) + sep === resolve(tmpdir()) + sep)
  await rm(fixture, { recursive: true, force: true })
}
