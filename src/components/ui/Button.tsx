import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'info' | 'infoAlt' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isDarkMode?: boolean;
}

const variantClasses = {
  primary: `
    bg-gradient-to-r from-amber-500 to-amber-600 
    text-white font-semibold
    hover:from-amber-400 hover:to-amber-500
    shadow-lg shadow-amber-500/20
    hover-lift
  `,
  secondary: `
    bg-zinc-800 text-zinc-100
    hover:bg-zinc-700
    border border-zinc-700
  `,
  ghost: `
    bg-transparent
    hover:bg-zinc-800/50
    text-zinc-400 hover:text-white
  `,
  danger: `
    bg-gradient-to-r from-red-500 to-red-600
    text-white font-semibold
    hover:from-red-400 hover:to-red-500
    shadow-lg shadow-red-500/20
  `,
  info: `
    bg-[#2f6db3] text-white font-semibold
    hover:bg-[#2a63a4]
    border border-[#2f6db3]
    shadow-sm
  `,
  infoAlt: `
    bg-[#1c4f80] text-white font-semibold
    hover:bg-[#18466f]
    border border-[#1c4f80]
    shadow-sm
  `,
  success: `
    bg-[#1f6d46] text-white font-semibold
    hover:bg-[#1b603e]
    border border-[#1f6d46]
    shadow-sm
  `
};

const variantClassesLight = {
  primary: variantClasses.primary,
  secondary: `
    bg-zinc-100 text-zinc-900
    hover:bg-zinc-200
    border border-zinc-200
  `,
  ghost: `
    bg-transparent
    hover:bg-zinc-100
    text-zinc-600 hover:text-zinc-900
  `,
  danger: variantClasses.danger,
  info: `
    bg-[#2f6db3] text-white font-semibold
    hover:bg-[#2a63a4]
    border border-[#2f6db3]
  `,
  infoAlt: `
    bg-[#1c4f80] text-white font-semibold
    hover:bg-[#18466f]
    border border-[#1c4f80]
  `,
  success: `
    bg-[#1f6d46] text-white font-semibold
    hover:bg-[#1b603e]
    border border-[#1f6d46]
  `
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5'
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  isDarkMode = true,
  className = '',
  disabled,
  ...props
}) => {
  const variants = isDarkMode ? variantClasses : variantClassesLight;

  return (
    <button
      className={`
        inline-flex items-center justify-center
        font-medium
        transition-all duration-200
        focus-ring
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${variants[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};

export default Button;
