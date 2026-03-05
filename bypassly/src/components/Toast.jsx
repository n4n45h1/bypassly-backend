import { useState, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { toast } from '/src/utils/toast';
import { useOptions } from '/src/utils/optionsContext';

const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  info:    Info,
};

const COLORS = {
  success: '#4ade80',
  error:   '#f87171',
  info:    '#60a5fa',
};

let _id = 0;
const DURATION = 3200;

const ToastItem = memo(({ item, onRemove }) => {
  const { options } = useOptions();
  const bg     = options.quickModalBgColor || '#252f3e';
  const text   = options.siteTextColor    || '#a0b0c8';
  const Icon   = ICONS[item.type] || Info;
  const color  = COLORS[item.type] || COLORS.info;

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${color}33`,
        color: text,
        boxShadow: `0 4px 24px rgba(0,0,0,0.35), 0 0 0 1px ${color}22`,
        animation: 'toast-in 0.25s cubic-bezier(.34,1.56,.64,1) both',
      }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl min-w-[220px] max-w-[340px] relative"
    >
      <Icon size={16} style={{ color, flexShrink: 0 }} />
      <span className="text-sm flex-1 leading-snug">{item.message}</span>
      <button
        onClick={() => onRemove(item.id)}
        className="opacity-40 hover:opacity-80 transition-opacity ml-1 flex-shrink-0"
      >
        <X size={13} />
      </button>

      {/* progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '2px',
          background: color,
          borderRadius: '0 0 0 12px',
          animation: `toast-bar ${DURATION}ms linear both`,
        }}
      />
    </div>
  );
});

ToastItem.displayName = 'ToastItem';

const Toast = () => {
  const [items, setItems] = useState([]);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  useEffect(() => {
    toast._register((message, type) => {
      const id = ++_id;
      setItems((prev) => [...prev.slice(-4), { id, message, type }]);
      setTimeout(() => remove(id), DURATION + 100);
    });
    return () => toast._register(null);
  }, [remove]);

  if (items.length === 0) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(12px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toast-bar {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
      <div
        style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999 }}
        className="flex flex-col gap-2 items-end"
      >
        {items.map((item) => (
          <ToastItem key={item.id} item={item} onRemove={remove} />
        ))}
      </div>
    </>,
    document.body,
  );
};

Toast.displayName = 'Toast';
export default Toast;
