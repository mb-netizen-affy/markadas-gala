// "Star Kids (0 à 14 ans)" → "starkids0a14ans"
// Sert à comparer des noms sans se soucier des accents, majuscules et espaces,
// et à fabriquer les liens (slugs) des catégories.
export function normaliser(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}