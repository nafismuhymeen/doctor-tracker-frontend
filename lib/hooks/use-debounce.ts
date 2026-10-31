import { useState, useEffect } from "react";

/**
 * Custom hook to debounce any fast-changing value (e.g. search inputs).
 * If the value becomes empty string, it updates immediately for responsive resets.
 *
 * @param value The value to debounce
 * @param delay The debounce delay in milliseconds (default: 400ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Immediate update when clearing input
        if (value === "" || value === null || value === undefined) {
            setDebouncedValue(value);
            return;
        }

        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

