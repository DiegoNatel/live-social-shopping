// Chat messages refused before they reach anyone. Deliberately small: anything subtler is
// handled by reports. Hosts can post links and phone numbers; viewers can't, which keeps
// scams and sales outside the site out of the chat.

// Compared without accents or capitals, whole words only
const BLOCKED_WORDS = ['viado', 'traveco', 'crioulo', 'pedofilo', 'nazista', 'puta', 'vadia', 'arrombado', 'corno']

const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|br|io|me|ly|gg|link|app|site|shop|store)\b)/i
// A Brazilian number with area code; a list of sizes like "38 40 42 44" doesn't match
const PHONE = /\(?\b\d{2}\)?[\s-]?9?\d{4}[\s-]?\d{4}\b/

const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const WORDS = new RegExp(`\\b(${BLOCKED_WORDS.join('|')})\\b`)

// The reason shown to the sender, or null when the message is fine
export function chatRefusal(text: string, { host }: { host: boolean }) {
  if (WORDS.test(normalize(text))) return 'Sua mensagem tem uma palavra não permitida no chat.'
  if (!host && (LINK.test(text) || PHONE.test(text))) return 'Links e telefones não são permitidos no chat.'
  return null
}
