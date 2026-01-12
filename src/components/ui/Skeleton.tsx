import React from 'react';

interface SkeletonProps {
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    className?: string;
    count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    variant = 'text',
    width,
    height,
    className = '',
    count = 1
}) => {
    const variantClasses = {
        text: 'h-4 rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-lg'
    };

    const style: React.CSSProperties = {
        width: width || (variant === 'text' ? '100%' : undefined),
        height: height || (variant === 'circular' ? width : undefined)
    };

    const items = Array.from({ length: count }, (_, i) => (
        <div
            key={i}
            className={`skeleton ${variantClasses[variant]} ${className}`}
            style={style}
        />
    ));

    return count === 1 ? items[0] : <div className="space-y-2">{items}</div>;
};

// Preset skeletons for common use cases
export const SkeletonCard: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode = true }) => (
    <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
        <div className="flex items-center gap-3 mb-3">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1">
                <Skeleton variant="text" width="60%" className="mb-2" />
                <Skeleton variant="text" width="40%" height={12} />
            </div>
        </div>
        <Skeleton variant="rectangular" height={80} />
    </div>
);

export const SkeletonFileItem: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode = true }) => (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
        <Skeleton variant="rectangular" width={48} height={48} />
        <div className="flex-1">
            <Skeleton variant="text" width="70%" className="mb-2" />
            <Skeleton variant="text" width="40%" height={10} />
        </div>
        <Skeleton variant="rectangular" width={60} height={24} />
    </div>
);

export default Skeleton;
