// R3F normally maps the mouse using the canvas position measured earlier, which drifts as the page
// scrolls (hover and grab land in the wrong place). This measures the canvas on every event instead.
export function livePointer(state) {
  state.setEvents({
    compute: (event, s) => {
      const r = s.gl.domElement.getBoundingClientRect()
      s.pointer.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1)
      s.raycaster.setFromCamera(s.pointer, s.camera)
    },
  })
}
