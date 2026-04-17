export const THEME_STORAGE_KEY = 'securechat-theme';

export function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}
