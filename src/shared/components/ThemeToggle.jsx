import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'theme';

function readInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage may be unavailable in private mode.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

/**
 * Toggle between light and dark themes. Persists the choice to localStorage
 * and respects `prefers-color-scheme` on first visit. The actual theme is
 * applied by toggling `class="dark"` on <html>, which the design tokens in
 * globals.css listen for.
 *
 * The inline script in index.html applies the same logic synchronously before
 * paint, preventing the flash-of-light-content on first load in dark mode.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore — the class on <html> already applies for this session.
    }
  }, [theme]);

  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-lg text-fg-secondary hover:text-brand-primary hover:bg-surface-2 transition-all"
      aria-label={label}
      aria-pressed={isDark}
      title={label}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
