import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';

interface ThemeState {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  initializeTheme: () => void;
}

const applyThemeToDocument = (theme: ThemeMode) => {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  }
};

const getSavedTheme = (): ThemeMode => {
  try {
    const saved = localStorage.getItem('steamfolder_theme');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // Ignore storage read errors
  }
  return 'dark'; // Default to Steam Dark mode
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getSavedTheme(),

  toggleTheme: () => {
    const nextTheme: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('steamfolder_theme', nextTheme);
    } catch {
      // Ignore storage write errors
    }
    applyThemeToDocument(nextTheme);
    set({ theme: nextTheme });
  },

  setTheme: (newTheme: ThemeMode) => {
    try {
      localStorage.setItem('steamfolder_theme', newTheme);
    } catch {
      // Ignore storage write errors
    }
    applyThemeToDocument(newTheme);
    set({ theme: newTheme });
  },

  initializeTheme: () => {
    const current = getSavedTheme();
    applyThemeToDocument(current);
    set({ theme: current });
  },
}));
