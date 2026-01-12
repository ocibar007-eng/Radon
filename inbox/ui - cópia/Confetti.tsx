import React, { useEffect, useState, useCallback } from 'react';

interface ConfettiPiece {
    id: number;
    x: number;
    color: string;
    delay: number;
    duration: number;
    size: number;
}

interface ConfettiProps {
    isActive: boolean;
    duration?: number;
    particleCount?: number;
    onComplete?: () => void;
}

const COLORS = [
    '#f59e0b', // amber
    '#10b981', // emerald
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#ef4444', // red
    '#06b6d4', // cyan
    '#f97316'  // orange
];

export const Confetti: React.FC<ConfettiProps> = ({
    isActive,
    duration = 3000,
    particleCount = 50,
    onComplete
}) => {
    const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

    const generatePieces = useCallback(() => {
        return Array.from({ length: particleCount }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            delay: Math.random() * 0.5,
            duration: 2 + Math.random() * 2,
            size: 6 + Math.random() * 6
        }));
    }, [particleCount]);

    useEffect(() => {
        if (isActive) {
            setPieces(generatePieces());

            const timer = setTimeout(() => {
                setPieces([]);
                onComplete?.();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [isActive, duration, generatePieces, onComplete]);

    if (!isActive || pieces.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
            {pieces.map(piece => (
                <div
                    key={piece.id}
                    className="absolute top-0"
                    style={{
                        left: `${piece.x}%`,
                        width: piece.size,
                        height: piece.size,
                        backgroundColor: piece.color,
                        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                        transform: `rotate(${Math.random() * 360}deg)`,
                        animation: `confetti-fall ${piece.duration}s ease-in ${piece.delay}s forwards`
                    }}
                />
            ))}
        </div>
    );
};

export default Confetti;
