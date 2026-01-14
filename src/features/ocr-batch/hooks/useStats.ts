import { useState, useEffect } from 'react';

const STORAGE_KEYS = {
    USAGE_MINUTES: 'ocr-batch-usage-minutes',
    CLICK_COUNT: 'ocr-batch-click-count',
    FIRST_USE: 'ocr-batch-first-use',
    TOTAL_FILES_PROCESSED: 'ocr-batch-total-files'
};

export interface UsageStats {
    usageMinutes: number;
    clickCount: number;
    firstUseDate: number;
    totalFilesProcessed: number;
    currentTime: Date;
}

export interface UseStatsReturn extends UsageStats {
    incrementFilesProcessed: (count: number) => void;
    resetStats: () => void;
}

export const useStats = (): UseStatsReturn => {
    const [currentTime, setCurrentTime] = useState(new Date());

    const [usageMinutes, setUsageMinutes] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.USAGE_MINUTES);
        return saved ? parseInt(saved) : 0;
    });

    const [clickCount, setClickCount] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.CLICK_COUNT);
        return saved ? parseInt(saved) : 0;
    });

    const [firstUseDate] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.FIRST_USE);
        if (saved) return parseInt(saved);
        const now = Date.now();
        localStorage.setItem(STORAGE_KEYS.FIRST_USE, String(now));
        return now;
    });

    const [totalFilesProcessed, setTotalFilesProcessed] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.TOTAL_FILES_PROCESSED);
        return saved ? parseInt(saved) : 0;
    });

    // Update clock every second
    useEffect(() => {
        const clockInterval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(clockInterval);
    }, []);

    // Track usage time (increment every minute)
    useEffect(() => {
        const usageInterval = setInterval(() => {
            setUsageMinutes(prev => {
                const newVal = prev + 1;
                localStorage.setItem(STORAGE_KEYS.USAGE_MINUTES, String(newVal));
                return newVal;
            });
        }, 60000);
        return () => clearInterval(usageInterval);
    }, []);

    // Track clicks
    useEffect(() => {
        const handleClick = () => {
            setClickCount(prev => {
                const newVal = prev + 1;
                localStorage.setItem(STORAGE_KEYS.CLICK_COUNT, String(newVal));
                return newVal;
            });
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    const incrementFilesProcessed = (count: number) => {
        setTotalFilesProcessed(prev => {
            const newVal = prev + count;
            localStorage.setItem(STORAGE_KEYS.TOTAL_FILES_PROCESSED, String(newVal));
            return newVal;
        });
    };

    const resetStats = () => {
        setUsageMinutes(0);
        setClickCount(0);
        setTotalFilesProcessed(0);
        localStorage.setItem(STORAGE_KEYS.USAGE_MINUTES, '0');
        localStorage.setItem(STORAGE_KEYS.CLICK_COUNT, '0');
        localStorage.setItem(STORAGE_KEYS.TOTAL_FILES_PROCESSED, '0');
    };

    return {
        usageMinutes,
        clickCount,
        firstUseDate,
        totalFilesProcessed,
        currentTime,
        incrementFilesProcessed,
        resetStats
    };
};
