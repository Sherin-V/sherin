// Where the name blocks sit, shared by the 3D scene and the hand-drawn notes around it.
// All lengths are in scene units unless a name says px.

export const WORDS = ['SHERIN', 'VARGHESE']
export const GAP = 1.14 // block spacing the drops were recorded with
export const SHELF_RISE = 1.75 // top shelf height above the bottom one, in block sizes
export const SHELF_BACK = 2.4 // top shelf sits further back, in block sizes
export const CAMERA_Z = 13
export const FOV = 32

export function blockLayout(viewW, viewH) {
  const widest = Math.max(...WORDS.map((w) => w.length)) * GAP + 0.6
  // Phones get almost the full width: the long name otherwise leaves the blocks tiny
  const fit = viewW / viewH < 1 ? 0.92 : 0.9
  const size = Math.min(1.3, (viewW * fit) / widest, (viewH * 0.4) / (SHELF_RISE + 1.2))
  // Bottom shelf a little below the middle; the pair is centred around the hero
  const base = viewH * 0.02 - ((SHELF_RISE + 1) * size) / 2
  return { size, base }
}

// Screen positions (px from the hero's top-left) of each word's left/right edge and middle height
export function wordAnchorsPx(widthPx, heightPx) {
  const viewH = 2 * CAMERA_Z * Math.tan(((FOV / 2) * Math.PI) / 180)
  const viewW = (viewH * widthPx) / heightPx
  const { size, base } = blockLayout(viewW, viewH)
  const unit = heightPx / viewH
  const toPx = (x, y, z = 0) => {
    const k = CAMERA_Z / (CAMERA_Z - z) // perspective shrink for things set further back
    return { x: widthPx / 2 + x * k * unit, y: heightPx / 2 - y * k * unit }
  }
  const half = (word) => (word.length * GAP) / 2 * size
  const [top, bottom] = WORDS
  const topY = base + SHELF_RISE * size + size / 2
  const topZ = -SHELF_BACK * size
  return {
    blockPx: size * unit,
    top: { left: toPx(-half(top), topY, topZ), right: toPx(half(top), topY, topZ) },
    bottom: { left: toPx(-half(bottom), base + size / 2), right: toPx(half(bottom), base + size / 2) },
  }
}
