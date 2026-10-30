// Address for a CEP from ViaCEP (free public API), to fill address forms.
// null for an incomplete CEP or when ViaCEP is unreachable (the fields can still be typed in);
// 'NOT_FOUND' for a CEP that doesn't exist.
export async function lookupCep(cep: string) {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    const data = (await res.json()) as { erro?: boolean | string; logradouro?: string; bairro?: string; localidade?: string; uf?: string }
    if (data.erro) return 'NOT_FOUND' as const
    return { street: data.logradouro ?? '', neighborhood: data.bairro ?? '', city: data.localidade ?? '', state: data.uf ?? '' }
  } catch {
    return null
  }
}
