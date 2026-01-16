import React from 'react';

interface CardProps {
    children: React.ReactNode;
    variant?: 'default' | 'glass' | 'elevated';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    isDarkMode?: boolean;
    className?: string;
    onClick?: () => void;
    isInteractive?: boolean;
}

const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
};

export const Card: React.FC<CardProps> = ({
    children,
    variant = 'default',
    padding = 'md',
    isDarkMode = true,
    className = '',
    onClick,
    isInteractive = false
}) => {
    const baseClasses = 'rounded-xl transition-all duration-200';

    const variantClasses = {
        default: isDarkMode
            ? 'bg-zinc-900 border border-zinc-800'
            : 'bg-white border border-zinc-200',
        glass: isDarkMode
            ? 'glass'
            : 'glass-light',
        elevated: isDarkMode
            ? 'bg-zinc-800 shadow-xl shadow-black/20'
            : 'bg-white shadow-xl shadow-zinc-200/50'
    };

    const interactiveClasses = isInteractive
        ? 'cursor-pointer hover-lift active:scale-[0.98]'
        : '';

    return (
        <div
            className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${interactiveClasses}
        ${className}
      `}
            onClick={onClick}
        >
            {children}
        </div>
    );
};

export default Card;
