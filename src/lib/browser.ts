export function isAppleTouchDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS reports itself as Macintosh.
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function isSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const safari = /Safari/i.test(ua);
  const other = /Chrome|CriOS|FxiOS|EdgiOS|OPiOS|Android/i.test(ua);
  return safari && !other;
}

/** iPhone/iPad Safari (and Chrome on iOS, which is WebKit) need a tap before audio. */
export function needsPlaybackGesture(): boolean {
  return isAppleTouchDevice();
}
