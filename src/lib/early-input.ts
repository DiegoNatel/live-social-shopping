// Keeps what people type before the page's JavaScript has loaded.
//
// The server sends the form's HTML first, so on a slow connection the fields are on screen
// (and typeable) seconds before React takes over. When it does, React resets every field to
// its own state, silently wiping that early typing: a seller's new description, a buyer's
// name at signup. To avoid it:
// 1. EARLY_INPUT_SCRIPT runs at the top of every page, before React, and records the last
//    value of each field the person types into.
// 2. After React takes over, restoreEarlyInput (see components/layout/EarlyInputRestore.tsx)
//    puts each value back and fires the field's input event, so the form's own onChange
//    handler stores it in state, exactly as if it had been typed then.

declare global {
  interface Window {
    __whEarlyInput?: Map<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, string>
    __whEarlyInputStop?: () => void
  }
}

// Inline, so it must stay small and self-contained (plain ES5, no imports)
export const EARLY_INPUT_SCRIPT = `(function(){
var m=new Map();window.__whEarlyInput=m;
function rec(e){var t=e.target;if(!t||!t.tagName)return;var n=t.tagName;
if(n==='TEXTAREA'||n==='SELECT'||(n==='INPUT'&&!/^(checkbox|radio|file|submit|button|hidden|image|reset)$/.test(t.type)))m.set(t,t.value)}
document.addEventListener('input',rec,true);document.addEventListener('change',rec,true);
window.__whEarlyInputStop=function(){document.removeEventListener('input',rec,true);document.removeEventListener('change',rec,true)};
})();`

// React marks each element it has taken over with a "__reactProps$…" key
const hydrated = (el: object) => Object.keys(el).some(k => k.startsWith('__reactProps$'))

function apply(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype
  // The prototype's setter skips React's own tracking; resetting the tracker makes sure React
  // sees the value as new and calls the field's onChange
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value)
  ;(el as unknown as { _valueTracker?: { setValue(v: string): void } })._valueTracker?.setValue('')
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
}

// Puts early typing back once React has taken over each field. Parts of a page can be taken
// over later than others (streamed sections), so fields not ready yet are retried for a while.
export function restoreEarlyInput() {
  const typed = window.__whEarlyInput
  if (!typed) return
  let tries = 0
  const run = () => {
    for (const [el, value] of typed) {
      if (!el.isConnected) {
        typed.delete(el)
      } else if (hydrated(el)) {
        // Always, even if the field still shows the text: React resets the field to its state
        // right after taking over, so the value has to reach the state through onChange
        apply(el, value)
        typed.delete(el)
      }
    }
    if (typed.size > 0 && ++tries < 20) setTimeout(run, 250)
    else window.__whEarlyInputStop?.()
  }
  run()
}
