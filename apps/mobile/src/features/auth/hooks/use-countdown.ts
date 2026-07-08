import { useCallback, useEffect, useState } from 'react';

export function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!active || seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds, active]);

  const reset = useCallback(() => {
    setSeconds(initialSeconds);
    setActive(true);
  }, [initialSeconds]);

  const formatted = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return { seconds, formatted, isDone: seconds <= 0, reset };
}
