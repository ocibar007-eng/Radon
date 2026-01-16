import React from 'react';

interface ProgressBarProps {
    value: number; // 0-100
    max?: number;
    showPercentage?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'success' | 'warning' | 'danger';
    animated?: boolean;
    isDarkMode?: boolean;
    className?: string;
}

const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
};

const variantClasses = {
    default: 'from-amber-500 to-amber-400',
    success: 'from-emerald-500 to-emerald-400',
    warning: 'from-yellow-500 to-yellow-400',
    danger: 'from-red-500 to-red-400'
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
    value,
    max = 100,
    showPercentage = false,
    size = 'md',
    variant = 'default',
    animated = true,
    isDarkMode = true,
    className = ''
}) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const isComplete = percentage >= 100;

    return (
        <div className={`w-full ${className}`}>
            <div className="flex items-center gap-3">
                {/* Bar Container */}
                <div
                    className={`
            flex-1 rounded-full overflow-hidden
            ${sizeClasses[size]}
            ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'}
          `}
                >
                    {/* Progress Fill */}
                    <div
                        className={`
              h-full rounded-full
              bg-gradient-to-r ${variantClasses[variant]}
              transition-all duration-500 ease-out
              ${animated && !isComplete ? 'animate-pulse-glow' : ''}
              ${isComplete ? 'animate-bounce-in' : ''}
            `}
                        style={{
                            width: `${percentage}%`,
                            backgroundSize: animated ? '200% 100%' : '100% 100%'
                        }}
                    >
                        {/* Shimmer Effect */}
                        {animated && !isComplete && (
                            <div
                                className="h-full w-full relative overflow-hidden"
                            >
                                <div
                                    className="absolute inset-0 animate-shimmer"
                                    style={{
                                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)'
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Percentage Text */}
                {showPercentage && (
                    <span
                        className={`
              text-xs font-mono font-medium tabular-nums
              min-w-[3rem] text-right
              ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}
              ${isComplete ? 'text-emerald-500' : ''}
            `}
                    >
                        {Math.round(percentage)}%
                    </span>
                )}
            </div>
        </div>
    );
};

export default ProgressBar;
