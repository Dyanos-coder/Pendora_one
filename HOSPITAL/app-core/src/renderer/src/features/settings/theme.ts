// Thème d'affichage du poste (Paramètres › Apparence) : clair, sombre, ou automatique (suit Windows).
// Préférence propre à ce poste, gardée dans le stockage local du navigateur intégré ; appliquée sur
// <html data-theme> avant le premier rendu pour éviter un flash de la mauvaise couleur.

export type ThemeMode = 'light' | 'dark' | 'auto'

const KEY = 'pandora-theme'

export function getThemeMode(): ThemeMode {
  try {
    const value = localStorage.getItem(KEY)
    if (value === 'light' || value === 'dark' || value === 'auto') return value
  } catch {
    // Stockage indisponible : thème clair par défaut.
  }
  return 'light'
}

export function applyThemeMode(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode
}

export function setThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    // Non mémorisé : appliqué pour cette session seulement.
  }
  applyThemeMode(mode)
}
