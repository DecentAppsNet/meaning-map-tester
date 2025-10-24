import { useEffect, useRef, useState } from 'react';
import styles from './MatchTextInput.module.css';

type Props = {
  onChange: (text: string) => void;
};

const DEBOUNCE_MS = 500;

export default function MatchTextInput({ onChange }: Props) {
  const [value, setValue] = useState<string>('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (value.length === 0) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      onChange(value);
      timerRef.current = null;
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, onChange]);

  return (
    <div className={styles.container}>
      <input
        className={styles.input}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value.toLowerCase())}
        placeholder="Type text to match against meaning map"
      />
    </div>
  );
}
