import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

// macOS sips compresses opaque colour textures; geometry, skinning and animation bytes stay intact.
const [input, output] = process.argv.slice(2)
assert.ok(input && output, 'Usage: node scripts/optimize-character-textures.mjs input.glb output.glb')
const original = readFileSync(input)
assert.equal(original.readUInt32LE(0), 0x46546c67)
assert.equal(original.readUInt32LE(4), 2)
const jsonLength = original.readUInt32LE(12)
const doc = JSON.parse(original.subarray(20, 20 + jsonLength))
assert.equal(doc.buffers.length, 1)
assert.ok(!doc.buffers[0].uri)
assert.ok(doc.materials.every((m) => !m.alphaMode || m.alphaMode === 'OPAQUE'), 'Transparent assets need lossless textures')
const binOffset = 20 + jsonLength + 8
const binary = original.subarray(binOffset)
const directory = mkdtempSync(join(tmpdir(), 'diary-textures-'))
const replacements = new Map()
const report = []
try {
  for (const [index, image] of doc.images.entries()) {
    assert.equal(image.mimeType, 'image/png', 'Use the original PNG export as the input')
    const view = doc.bufferViews[image.bufferView]
    const png = binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)
    const source = join(directory, `${index}.png`)
    const target = join(directory, `${index}.jpg`)
    writeFileSync(source, png)
    const result = spawnSync('sips', ['-Z', '2048', '-s', 'format', 'jpeg', '-s', 'formatOptions', '85', source, '--out', target], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    const jpeg = readFileSync(target)
    assert.ok(jpeg.length < png.length, 'Compression must reduce the image size')
    replacements.set(image.bufferView, jpeg)
    image.mimeType = 'image/jpeg'
    report.push({ image: image.name, before: png.length, after: jpeg.length })
  }
  const parts = []
  let offset = 0
  for (const [index, view] of doc.bufferViews.entries()) {
    const bytes = replacements.get(index) ?? binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)
    if (offset % 4) {
      const pad = Buffer.alloc(4 - offset % 4)
      parts.push(pad); offset += pad.length
    }
    view.byteOffset = offset
    view.byteLength = bytes.length
    parts.push(bytes); offset += bytes.length
  }
  doc.buffers[0].byteLength = offset
  if (offset % 4) parts.push(Buffer.alloc(4 - offset % 4))
  const bin = Buffer.concat(parts)
  const json = Buffer.from(JSON.stringify(doc))
  const paddedJson = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)])
  const header = Buffer.alloc(20)
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4)
  header.writeUInt32LE(28 + paddedJson.length + bin.length, 8)
  header.writeUInt32LE(paddedJson.length, 12); header.writeUInt32LE(0x4e4f534a, 16)
  const binHeader = Buffer.alloc(8)
  binHeader.writeUInt32LE(bin.length, 0); binHeader.writeUInt32LE(0x004e4942, 4)
  const optimized = Buffer.concat([header, paddedJson, binHeader, bin])
  // Verify every non-image buffer view byte-for-byte after repacking.
  const old = JSON.parse(original.subarray(20, 20 + jsonLength))
  for (const [index, view] of doc.bufferViews.entries()) {
    if (replacements.has(index)) continue
    const previous = old.bufferViews[index]
    assert.deepEqual(bin.subarray(view.byteOffset, view.byteOffset + view.byteLength),
      binary.subarray(previous.byteOffset ?? 0, (previous.byteOffset ?? 0) + previous.byteLength))
  }
  writeFileSync(output, optimized)
  console.log(JSON.stringify({ before: original.length, after: optimized.length, savedPercent: +(100 * (1 - optimized.length / original.length)).toFixed(1), images: report,
    geometryAndAnimationUnchanged: true }, null, 2))
} finally {
  rmSync(directory, { recursive: true, force: true })
}
