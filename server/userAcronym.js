/**
 * Acronyme à 3 lettres d'un utilisateur Supabase Auth, écrit dans `resolved_by`.
 *
 * Source : le « Display name » du compte (user_metadata.display_name, ou full_name / name),
 * à défaut la partie locale de l'email. Accents et ponctuation sont ignorés.
 * - un mot       : ses 3 premières lettres           (« Lucien »            → LUC)
 * - deux mots    : initiale + 2 lettres du second   (« Lucien Andrieux »   → LAN)
 * - trois mots + : initiales des deux premiers et du dernier (« Jean-Claude Roux » → JCR)
 * Renvoie null si aucune lettre n'est exploitable.
 */
export function getUserAcronym(user) {
  const metadata = user?.user_metadata ?? {}
  const name = [metadata.display_name, metadata.full_name, metadata.name].find(
    (value) => typeof value === 'string' && value.trim() !== '',
  )
  return acronymFrom(name ?? user?.email?.split('@')[0] ?? '')
}

function acronymFrom(text) {
  const words = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean)

  if (words.length === 0) return null
  if (words.length === 1) return words[0].slice(0, 3)

  const [first, second] = words
  const last = words.at(-1)
  const acronym = words.length === 2 ? first[0] + second.slice(0, 2) : first[0] + second[0] + last[0]
  // Nom de famille d'une seule lettre : on complète avec le prénom.
  return (acronym + first.slice(1)).slice(0, 3)
}
