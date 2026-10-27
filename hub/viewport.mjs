export const TV_FRAME = Object.freeze({
  width: 1920,
  height: 1080,
  paddingY: 48,
});

// Keep every TV element in the same coordinate system, including dialogs and focus.
export function mountViewport(frame, host = window) {
  function fit() {
    const width = Math.max(1, host.innerWidth);
    const height = Math.max(1, host.innerHeight);
    const padding = Math.min(
      TV_FRAME.paddingY,
      (height * TV_FRAME.paddingY) / TV_FRAME.height,
    );
    const scale = Math.min(
      width / TV_FRAME.width,
      (height - padding * 2) / TV_FRAME.height,
    );
    frame.style.left = (width - TV_FRAME.width * scale) / 2 + "px";
    frame.style.top = (height - TV_FRAME.height * scale) / 2 + "px";
    frame.style.transform = "scale(" + scale + ")";
    frame.dataset.ready = "true";
  }
  fit();
  host.addEventListener("resize", fit);
  return () => host.removeEventListener("resize", fit);
}
