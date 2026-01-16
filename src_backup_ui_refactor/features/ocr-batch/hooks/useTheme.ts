import { useState, useEffect, useCallback } from 'react';

export type ThemeName = 'default' | 'ocean' | 'forest' | 'sunset' | 'midnight';
export type ColorMode = 'light' | 'dark' | 'system';

interface ThemeConfig {
    name: ThemeName;
    label: string;
    accent: string;
    preview: string;
}

export const THEMES: ThemeConfig[] = [
    { name: 'default', label: 'Amber', accent: '#f59e0b', preview: 'from-amber-500 to-amber-600' },
    { name: 'ocean', label: 'Ocean', accent: '#0ea5e9', preview: 'from-sky-500 to-cyan-500' },
    { name: 'forest', label: 'Forest', accent: '#22c55e', preview: 'from-emerald-500 to-green-500' },
    { name: 'sunset', label: 'Sunset', accent: '#f97316', preview: 'from-orange-500 to-red-500' },
    { name: 'midnight', label: 'Midnight', accent: '#8b5cf6', preview: 'from-violet-500 to-purple-500' }
];

const STORAGE_KEYS = {
    THEME: 'ocr-batch-theme',
    COLOR_MODE: 'ocr-batch-color-mode'
};

export interface UseThemeReturn {
    theme: ThemeName;
    colorMode: ColorMode;
    isDarkMode: boolean;
    setTheme: (theme: ThemeName) => void;
    setColorMode: (mode: ColorMode) => void;
    toggleDarkMode: () => void;
}

export const useTheme = (): UseThemeReturn => {
    const [theme, setThemeState] = useState<ThemeName>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.THEME);
        return (saved as ThemeName) || 'default';
    });

    const [colorMode, setColorModeState] = useState<ColorMode>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.COLOR_MODE);
        return (saved as ColorMode) || 'dark';
    });

    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (colorMode === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return colorMode === 'dark';
    });


    // Apply color mode
    useEffect(() => {
        const updateDarkMode = () => {
            if (colorMode === 'system') {
                setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
            } else {
                setIsDarkMode(colorMode === 'dark');
            }
        };

        updateDarkMode();

        if (colorMode === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', updateDarkMode);
            return () => mediaQuery.removeEventListener('change', updateDarkMode);
        }
    }, [colorMode]);

    // Apply logic
    useEffect(() => {
        // Handle Dark Mode Class
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.remove('dark');
            // We can add a 'light' class if needed for CSS specificity, though usually :root:not(.dark) works
            document.documentElement.classList.add('light');
        }

        // Handle Theme Attribute (Always set the theme name, never 'light')
        document.documentElement.setAttribute('data-theme', theme);
    }, [isDarkMode, theme]);

    const setTheme = useCallback((newTheme: ThemeName) => {
        setThemeState(newTheme);
        localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    }, []);

    const setColorMode = useCallback((mode: ColorMode) => {
        setColorModeState(mode);
        localStorage.setItem(STORAGE_KEYS.COLOR_MODE, mode);
    }, []);

    const toggleDarkMode = useCallback(() => {
        setColorMode(isDarkMode ? 'light' : 'dark');
    }, [isDarkMode, setColorMode]);

    return {
        theme,
        colorMode,
        isDarkMode,
        setTheme,
        setColorMode,
        toggleDarkMode
    };
};
