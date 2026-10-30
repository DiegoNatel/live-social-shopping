// After a deploy, a tab still running the previous version asks for page files (chunks)
// that no longer exist. Reloading once picks up the new version. The time guard stops a
// reload loop if the error keeps happening for another reason.

const KEY = 'vivobuy-reloaded-at'

export const isStaleBuildError = (error: unknown) => {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  return /ChunkLoadError|Loading chunk|Loading CSS chunk|Failed to fetch dynamically imported module|Failed to load chunk/i.test(text)
}

// Reloads the page unless it already did in the last 30 seconds; returns whether it reloaded
export function reloadForNewVersion() {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0)
    if (Date.now() - last < 30_000) return false
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    // Storage blocked: reload anyway (worst case, the error page shows after it)
  }
  window.location.reload()
  return true
}
