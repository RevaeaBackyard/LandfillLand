/**
 * Generate favicon assets from a public Open Graph image.
 * Usage: pnpm generate-favicon [input-image]
 */

import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const defaultInputCandidates = [
  'public/og-image.png',
  'public/icons/og-logo.png',
]

const defaultIcoPath = 'public/icons/favicon.ico'
const defaultSvgPath = 'public/icons/favicon.svg'
const icoSizes = [16, 32, 48, 64, 128, 256]
const svgSize = 256

interface ScriptOptions {
  inputPath?: string
  icoPath: string
  svgPath: string
}

interface IcoImage {
  size: number
  buffer: Buffer
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  }
  catch {
    return false
  }
}

function parseArgs(args: string[]): ScriptOptions {
  let inputPath: string | undefined
  let icoPath = defaultIcoPath
  let svgPath = defaultSvgPath

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]

    if (arg === '--input' || arg === '-i') {
      const value = args[index + 1]
      if (!value) {
        throw new Error(`${arg} requires a path`)
      }
      inputPath = value
      index++
      continue
    }

    if (arg === '--ico') {
      const value = args[index + 1]
      if (!value) {
        throw new Error('--ico requires a path')
      }
      icoPath = value
      index++
      continue
    }

    if (arg === '--svg') {
      const value = args[index + 1]
      if (!value) {
        throw new Error('--svg requires a path')
      }
      svgPath = value
      index++
      continue
    }

    if (arg === '--help' || arg === '-h') {
      console.log('Usage: pnpm generate-favicon [input-image] [--ico path] [--svg path]')
      process.exit(0)
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`)
    }

    if (inputPath) {
      throw new Error(`Unexpected extra argument: ${arg}`)
    }

    inputPath = arg
  }

  return {
    inputPath,
    icoPath,
    svgPath,
  }
}

async function resolveInputPath(inputPath?: string): Promise<string> {
  if (inputPath) {
    const resolvedPath = path.resolve(inputPath)
    if (await fileExists(resolvedPath)) {
      return resolvedPath
    }
    throw new Error(`Input image does not exist: ${inputPath}`)
  }

  for (const candidate of defaultInputCandidates) {
    const resolvedPath = path.resolve(candidate)
    if (await fileExists(resolvedPath)) {
      return resolvedPath
    }
  }

  throw new Error(`Input image not found. Expected one of: ${defaultInputCandidates.join(', ')}`)
}

async function createSquarePng(inputPath: string, size: number): Promise<Buffer> {
  return sharp(inputPath)
    .resize(size, size, {
      fit: 'cover',
      position: 'centre',
    })
    .png({
      adaptiveFiltering: true,
      compressionLevel: 9,
    })
    .toBuffer()
}

function createIco(images: IcoImage[]): Buffer {
  const headerSize = 6
  const directoryEntrySize = 16
  const directorySize = images.length * directoryEntrySize
  const imageOffsetStart = headerSize + directorySize
  const fileSize = imageOffsetStart + images.reduce((sum, image) => sum + image.buffer.length, 0)
  const icoBuffer = Buffer.alloc(fileSize)

  icoBuffer.writeUInt16LE(0, 0)
  icoBuffer.writeUInt16LE(1, 2)
  icoBuffer.writeUInt16LE(images.length, 4)

  let imageOffset = imageOffsetStart
  images.forEach((image, index) => {
    const entryOffset = headerSize + index * directoryEntrySize
    const sizeByte = image.size >= 256 ? 0 : image.size

    icoBuffer.writeUInt8(sizeByte, entryOffset)
    icoBuffer.writeUInt8(sizeByte, entryOffset + 1)
    icoBuffer.writeUInt8(0, entryOffset + 2)
    icoBuffer.writeUInt8(0, entryOffset + 3)
    icoBuffer.writeUInt16LE(1, entryOffset + 4)
    icoBuffer.writeUInt16LE(32, entryOffset + 6)
    icoBuffer.writeUInt32LE(image.buffer.length, entryOffset + 8)
    icoBuffer.writeUInt32LE(imageOffset, entryOffset + 12)

    image.buffer.copy(icoBuffer, imageOffset)
    imageOffset += image.buffer.length
  })

  return icoBuffer
}

function createSvg(pngBuffer: Buffer, size: number): string {
  const base64Image = pngBuffer.toString('base64')

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `  <image width="${size}" height="${size}" href="data:image/png;base64,${base64Image}" />`,
    '</svg>',
    '',
  ].join('\n')
}

async function generateFavicons(options: ScriptOptions): Promise<void> {
  const inputPath = await resolveInputPath(options.inputPath)
  const icoPath = path.resolve(options.icoPath)
  const svgPath = path.resolve(options.svgPath)
  const metadata = await sharp(inputPath).metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error(`Unable to read image dimensions: ${inputPath}`)
  }

  await fs.mkdir(path.dirname(icoPath), { recursive: true })
  await fs.mkdir(path.dirname(svgPath), { recursive: true })

  const icoImages = await Promise.all(
    icoSizes.map(async size => ({
      size,
      buffer: await createSquarePng(inputPath, size),
    })),
  )
  const icoBuffer = createIco(icoImages)
  const svgPngBuffer = await createSquarePng(inputPath, svgSize)

  await fs.writeFile(icoPath, icoBuffer)
  await fs.writeFile(svgPath, createSvg(svgPngBuffer, svgSize))

  console.log(`Source: ${path.relative(process.cwd(), inputPath)} (${metadata.width}x${metadata.height})`)
  console.log(`Generated: ${path.relative(process.cwd(), icoPath)} (${icoSizes.join(', ')}px)`)
  console.log(`Generated: ${path.relative(process.cwd(), svgPath)} (${svgSize}px embedded PNG)`)
}

generateFavicons(parseArgs(process.argv.slice(2))).catch((error: unknown) => {
  console.error('Failed to generate favicon assets:', error)
  process.exit(1)
})
