import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'white';
  showSubtitle?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'dark',
  showSubtitle = true,
}) => {
  const sizeClasses = {
    sm: {
      box: 'w-7 h-7 rounded-lg',
      icon: 'w-4 h-4',
      title: 'text-base',
      subtitle: 'text-[9px]',
    },
    md: {
      box: 'w-9 h-9 rounded-xl',
      icon: 'w-5 h-5',
      title: 'text-xl',
      subtitle: 'text-[10px]',
    },
    lg: {
      box: 'w-12 h-12 rounded-2xl',
      icon: 'w-6 h-6',
      title: 'text-2xl',
      subtitle: 'text-xs',
    },
    xl: {
      box: 'w-16 h-16 rounded-2xl',
      icon: 'w-8 h-8',
      title: 'text-3xl',
      subtitle: 'text-sm',
    },
  };

  const currentSize = sizeClasses[size];

  const titleColors = {
    dark: 'text-slate-900',
    light: 'text-emerald-950',
    white: 'text-white',
  };

  const subtitleColors = {
    dark: 'text-emerald-700',
    light: 'text-emerald-600',
    white: 'text-emerald-200',
  };

  return (
    <div className="flex items-center gap-3 select-none">
      <div
        className={`${currentSize.box} bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center shadow-md shadow-emerald-900/15 flex-shrink-0 text-white`}
      >
        <svg
          className={`${currentSize.icon}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span
          className={`font-black tracking-wider leading-none font-sans ${currentSize.title} ${titleColors[variant]}`}
        >
          LOG <span className="text-emerald-600 font-extrabold">MMS</span>
        </span>
        {showSubtitle && (
          <span
            className={`font-semibold tracking-widest uppercase mt-0.5 ${currentSize.subtitle} ${subtitleColors[variant]}`}
          >
            Gestão &amp; Rastreio
          </span>
        )}
      </div>
    </div>
  );
};
