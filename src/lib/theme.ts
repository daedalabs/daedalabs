export type Theme = 'light' | 'dark';

/**
 * How long the palette cross-fade runs. Keep in sync with the
 * `.theme-transition` rules in globals.css.
 */
const THEME_TRANSITION_MS = 300;
const THEME_TRANSITION_CLASS = 'theme-transition';

const listeners = new Set<() => void>();
let transitionTimer: number | undefined;

export function getTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setTheme(theme: Theme) {
  const root = document.documentElement;

  if (root.dataset.theme !== theme) {
    // Scoped to a single switch: the class lets every surface cross-fade
    // without slowing down ordinary hover/focus transitions.
    root.classList.add(THEME_TRANSITION_CLASS);
    // Flush styles so the class is active before the variables change.
    void root.offsetWidth;

    window.clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(() => {
      root.classList.remove(THEME_TRANSITION_CLASS);
    }, THEME_TRANSITION_MS + 50);
  }

  root.dataset.theme = theme;
  try {
    localStorage.setItem('daedalabs-theme', theme);
  } catch {
    // Storage can be unavailable in private mode; the toggle still works.
  }
  listeners.forEach((listener) => listener());
}
