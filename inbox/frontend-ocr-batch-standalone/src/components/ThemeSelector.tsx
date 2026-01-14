import React from 'react';
import { THEMES, ThemeName } from '@/hooks/useTheme';

interface ThemeSelectorProps {
    currentTheme: ThemeName;
    onSelectTheme: (theme: ThemeName) => void;
    isDarkMode: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
    currentTheme,
    onSelectTheme,
    isDarkMode
}) => {
    return (
        <div className="flex items-center gap-2">
            {THEMES.map(theme => (
                <button
                    key={theme.name}
                    onClick={() => onSelectTheme(theme.name)}
                    className={`
                        w-6 h-6 rounded-full transition-all duration-200
                        bg-gradient-to-br ${theme.preview}
                        ${currentTheme === theme.name
                            ? 'ring-2 ring-offset-2 ring-white/50 scale-110'
                            : 'hover:scale-110 opacity-70 hover:opacity-100'
                        }
                        ${isDarkMode ? 'ring-offset-zinc-900' : 'ring-offset-white'}
                    `}
                    title={theme.label}
                />
            ))}
        </div>
    );
};

export default ThemeSelector;
