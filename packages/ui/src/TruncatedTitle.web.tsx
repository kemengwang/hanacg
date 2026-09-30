import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
export function TruncatedTitle({ title, onClick }: { title: string; onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [position, setPosition] = useState<{ top: number; left: number }>();
  const id = useId();
  const hide = () => {
    clearTimeout(timer.current);
    setPosition(undefined);
  };
  const showLater = () => {
    clearTimeout(timer.current);
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth + 1) return;
    timer.current = setTimeout(() => {
      const rect = el.getBoundingClientRect();
      if (el.scrollWidth > el.clientWidth + 1)
        setPosition({
          top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 120)),
          left: Math.max(
            8,
            Math.min(rect.left, window.innerWidth - Math.min(320, window.innerWidth - 16) - 8),
          ),
        });
    }, 2000);
  };
  useEffect(() => {
    const close = () => hide();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', key);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', key);
    };
  }, [title]);
  return (
    <>
      <button
        ref={ref}
        className="card-title"
        aria-describedby={position ? id : undefined}
        onClick={() => {
          hide();
          onClick();
        }}
        onPointerEnter={(e) => {
          if (e.pointerType !== 'touch') showLater();
        }}
        onPointerLeave={hide}
        onFocus={showLater}
        onBlur={hide}
      >
        {title}
      </button>
      {position &&
        createPortal(
          <div id={id} role="tooltip" className="card-title-tooltip" style={position}>
            {title}
          </div>,
          document.body,
        )}
    </>
  );
}
