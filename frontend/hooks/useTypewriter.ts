import { useEffect, useState, useRef } from "react";

export function useTypewriter(
  text: string,
  minSpeed = 10,
  maxSpeed = 30,
  enabled = true,
  onComplete?: () => void
) {
  const [displayed, setDisplayed] = useState(() =>
    enabled ? "" : text
  );
  
  const indexRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text);
      if(onComplete) onComplete();
      return;
    }

    setDisplayed("");
    indexRef.current = 0;

    // 修复点：这里使用 any 或者 ReturnType<typeof setTimeout> 来避免 TS 报错
    let timeoutId: any;

    const typeNextChar = () => {
      if (indexRef.current >= text.length) {
        if (onComplete) onComplete();
        return;
      }

      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));

      let delay = Math.random() * (maxSpeed - minSpeed) + minSpeed;
      
      const char = text[indexRef.current - 1];
      if (['，', '。', '！', '？', '\n'].includes(char)) {
        delay += 150; 
      }

      timeoutId = setTimeout(typeNextChar, delay);
    };

    timeoutId = setTimeout(typeNextChar, minSpeed);

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, minSpeed, maxSpeed, enabled]); 

  return displayed;
}