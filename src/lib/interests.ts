// What each sign-up interest (components/onboarding/InterestsModal) means for lives: the live
// category it maps to, if any, and hashtag words that count as a match. Used to recommend lives
// ("Para você") and to tell interested users when one starts.

const INTERESTS: Record<string, { category?: string; keywords: string[] }> = {
  fashion: { category: 'fashion', keywords: ['moda', 'estilo', 'roupas', 'roupa', 'acessorios', 'vestidos', 'look'] },
  beauty: { category: 'beauty', keywords: ['beleza', 'skincare', 'maquiagem', 'make', 'cuidados', 'cabelo'] },
  electronics: { category: 'electronics', keywords: ['tech', 'eletronicos', 'gadgets', 'celular', 'celulares', 'iphone', 'apple'] },
  sports: { category: 'sports', keywords: ['esportes', 'esporte', 'outdoor', 'corrida'] },
  home: { category: 'home', keywords: ['casa', 'decoracao', 'moveis', 'organizacao', 'cozinha'] },
  kids: { keywords: ['infantil', 'kids', 'criancas', 'brinquedos', 'bebe'] },
  food: { category: 'food', keywords: ['alimentos', 'gourmet', 'receitas', 'comida', 'delivery'] },
  fitness: { category: 'sports', keywords: ['fitness', 'treino', 'academia', 'suplementos', 'saude'] },
  jewelry: { keywords: ['joias', 'joia', 'bijuterias', 'bijuteria', 'luxo'] },
  books: { keywords: ['livros', 'livro', 'papelaria', 'leitura'] },
  pets: { keywords: ['pets', 'pet', 'caes', 'cachorro', 'gatos', 'gato'] },
  games: { keywords: ['games', 'game', 'geek', 'consoles', 'gamer'] },
}

// "#Promoção" → "promocao": hashtags compare without "#", case or accents
export const normalizeTag = (tag: string) =>
  tag
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^#+/, '')
    .trim()
    .toLowerCase()

// Interests a live with this category and these hashtags is for
export function interestsForLive(category: string, tags: string[]) {
  const words = new Set(tags.map(normalizeTag))
  return Object.entries(INTERESTS)
    .filter(([, i]) => i.category === category || i.keywords.some(k => words.has(k)))
    .map(([id]) => id)
}

export const liveMatchesInterests = (live: { category: string; tags: string[] }, interests: string[]) =>
  interestsForLive(live.category, live.tags).some(id => interests.includes(id))
