import React from 'react';

// Shared Palette tokens (Hex strings and CSS tokens)
export const sdTokens = {
  ink: '#14101C',
  wood: '#2A1F2D',
  bronze: '#8A6A3B',
  gold: '#E8B84A',
  ki: '#5FE3D2',
  soul: '#9B6BFF',
  rift: '#C2234B',
};

// Tailwind helper classes
export const sdColors = {
  ink: 'bg-[#14101C]',
  wood: 'bg-[#2A1F2D]',
  bronze: 'border-[#8A6A3B]',
  gold: 'text-[#E8B84A]',
  ki: 'text-[#5FE3D2]',
  soul: 'text-[#9B6BFF]',
  rift: 'text-[#C2234B]',
};

// 1. BRAND PANEL: Surface, Raised, or Inset container with bronze-and-amber ornate framing
export const BrandPanel: React.FC<{ 
  children: React.ReactNode; 
  variant?: 'surface' | 'raised' | 'inset';
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
}> = ({ children, variant = 'surface', className = '', onClick, style }) => {
  const base = "rounded-xs border-2 border-[#8A6A3B] relative sd-ornate-frame";
  const variants = {
    surface: "bg-[#14101C] text-[#F2E6C9]",
    raised: "bg-[#2A1F2D] text-[#F2E6C9]",
    inset: "bg-[#100b1b] shadow-inner text-[#F2E6C9]",
  };
  return (
    <div 
      className={`${base} ${variants[variant]} ${className}`} 
      onClick={onClick} 
      style={style}
    >
      {children}
    </div>
  );
};

// 2. BRAND BUTTON: Standard action, row selector or navigation button
export const BrandButton: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger' | 'ki' | 'soul';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseEnter?: () => void;
  onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  selected?: boolean;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  'aria-label'?: string;
}> = ({
  children,
  variant = 'primary',
  onClick,
  onMouseEnter,
  onPointerDown,
  disabled,
  className = '',
  selected = false,
  style,
  type = 'button',
  title,
  'aria-label': ariaLabel,
}) => {
  const base = "px-3.5 py-1.5 rounded-xs border-2 font-bold font-pixel transition-all duration-150 flex items-center justify-center cursor-pointer select-none active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 min-h-[36px]";
  const variants = {
    primary: "bg-[#2A1F2D] border-[#8A6A3B] text-[#E8B84A] hover:bg-[#3d2c41] hover:border-[#E8B84A] shadow-[0_2px_8px_rgba(0,0,0,0.5)]",
    secondary: "bg-[#14101C] border-[#8A6A3B] text-[#F2E6C9] hover:bg-[#2A1F2D] hover:text-[#E8B84A]",
    quiet: "bg-transparent border-transparent text-[#94a3b8] hover:text-[#F2E6C9] hover:bg-[#2A1F2D]/40",
    danger: "bg-[#C2234B]/20 border-[#C2234B] text-[#fca5a5] hover:bg-[#C2234B]/35 hover:text-[#fee2e2]",
    ki: "bg-[#5FE3D2]/15 border-[#5FE3D2] text-[#5FE3D2] hover:bg-[#5FE3D2]/30",
    soul: "bg-[#9B6BFF]/15 border-[#9B6BFF] text-[#d8b4fe] hover:bg-[#9B6BFF]/30 hover:text-white",
  };
  
  const selectedStyle = selected 
    ? "border-[#E8B84A] bg-[#3a2744] text-[#E8B84A] ring-1 ring-[#E8B84A] shadow-[0_0_12px_rgba(232,184,74,0.4)]" 
    : "";

  return (
    <button 
      type={type}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onPointerDown={onPointerDown}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${selectedStyle} ${className}`}
      style={style}
      aria-pressed={selected}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </button>
  );
};

// 3. BRAND BADGE: Compact status and metadata label (zero-pill discipline)
export const BrandBadge: React.FC<{
  children: React.ReactNode;
  variant?: 'gold' | 'ki' | 'soul' | 'danger' | 'bronze' | 'neutral';
  className?: string;
  icon?: string;
}> = ({ children, variant = 'gold', className = '', icon }) => {
  const variants = {
    gold: "text-[#E8B84A] border-[#8A6A3B] bg-[#2A1F2D]/80",
    ki: "text-[#5FE3D2] border-[#5FE3D2]/60 bg-[#0d2a2d]/80",
    soul: "text-[#9B6BFF] border-[#9B6BFF]/60 bg-[#25153a]/80",
    danger: "text-[#C2234B] border-[#C2234B]/60 bg-[#35101b]/80",
    bronze: "text-[#F2E6C9] border-[#8A6A3B] bg-[#1a1423]/90",
    neutral: "text-[#94a3b8] border-[#382a4a] bg-[#14101C]/90",
  };

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 border rounded-xs text-[8px] font-bold font-pixel tracking-wide uppercase select-none ${variants[variant]} ${className}`}>
      {icon && <span className="text-[9px]">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

// 4. BRAND WIDGET: Compact metric card with semantic accent
export const BrandWidget: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: string;
  accent?: 'gold' | 'ki' | 'soul' | 'danger';
  className?: string;
}> = ({ label, value, icon, accent = 'gold', className = '' }) => {
  const accentColors = {
    gold: "text-[#E8B84A]",
    ki: "text-[#5FE3D2]",
    soul: "text-[#9B6BFF]",
    danger: "text-[#C2234B]",
  };

  return (
    <div className={`bg-[#14101C]/95 border-2 border-[#8A6A3B] rounded-xs px-2.5 py-1.5 shadow-md flex items-center gap-2 relative sd-ornate-frame ${className}`}>
      {icon && <span className="text-sm shrink-0">{icon}</span>}
      <div className="flex flex-col min-w-0">
        <span className="text-[7px] text-[#94a3b8] uppercase font-bold tracking-wider leading-none">
          {label}
        </span>
        <span className={`text-[10px] sm:text-xs font-bold font-pixel tabular-nums ${accentColors[accent]} leading-tight mt-0.5`}>
          {value}
        </span>
      </div>
    </div>
  );
};

// 5. BRAND PROGRESS: Accessible, bounded progress bar with semantic variants
export const BrandProgress: React.FC<{
  current: number;
  max: number;
  variant?: 'gold' | 'ki' | 'soul' | 'danger';
  className?: string;
  showText?: boolean;
  label?: string;
}> = ({ current, max, variant = 'gold', className = '', showText = false, label }) => {
  const pct = Math.max(0, Math.min(100, max > 0 ? (current / max) * 100 : 0));
  
  const fills = {
    gold: "bg-gradient-to-r from-[#b4862a] to-[#E8B84A] shadow-[0_0_8px_rgba(232,184,74,0.5)]",
    ki: "bg-gradient-to-r from-[#0284c7] to-[#5FE3D2] shadow-[0_0_8px_rgba(95,227,210,0.5)]",
    soul: "bg-gradient-to-r from-[#7c3aed] to-[#9B6BFF] shadow-[0_0_8px_rgba(155,107,255,0.5)]",
    danger: "bg-gradient-to-r from-[#991b1b] to-[#C2234B] shadow-[0_0_8px_rgba(194,35,75,0.5)]",
  };

  return (
    <div className={`w-full flex flex-col gap-1 ${className}`}>
      {(showText || label) && (
        <div className="flex items-center justify-between text-[7px] sm:text-[8px] font-pixel font-bold">
          {label && <span className="text-[#94a3b8] uppercase">{label}</span>}
          {showText && <span className="text-[#F2E6C9] ml-auto">{current}/{max}</span>}
        </div>
      )}
      <div className="w-full h-2 bg-[#090612] border border-[#8A6A3B]/60 rounded-xs overflow-hidden p-[1px]">
        <div 
          className={`h-full transition-all duration-300 rounded-xs ${fills[variant]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

// 6. BRAND SECTION TITLE: Reusable icon-and-title treatment
export const BrandSectionTitle: React.FC<{ 
  icon: string; 
  title: string; 
  subtitle?: string;
  className?: string;
}> = ({ icon, title, subtitle, className = '' }) => (
  <div className={`flex items-center justify-between border-b-2 border-[#8A6A3B] pb-1.5 mb-2.5 ${className}`}>
    <div className="flex items-center gap-2">
      <span className="text-base text-[#E8B84A]">{icon}</span>
      <h3 className="text-[10px] sm:text-xs font-bold text-[#E8B84A] tracking-wider uppercase font-pixel">
        {title}
      </h3>
    </div>
    {subtitle && (
      <span className="text-[7px] text-[#94a3b8] font-pixel tracking-tight">
        {subtitle}
      </span>
    )}
  </div>
);

// 7. GAME CABINET MODAL: Shared responsive modal frame, title bar, and close action
export const GameCabinetModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerIcon?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  className?: string;
}> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  headerIcon = '✦',
  headerRight,
  children,
  footer,
  maxWidth = 'max-w-4xl',
  className = '',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-[#07050d]/92 backdrop-blur-md select-none font-pixel">
      <BrandPanel variant="surface" className={`w-full ${maxWidth} flex flex-col max-h-[96dvh] overflow-hidden text-[#F2E6C9] p-0 ${className}`}>
        
        {/* Title Bar */}
        <div className="px-4 py-3 border-b-2 border-[#8A6A3B] bg-[#191224] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[#E8B84A] text-sm shrink-0">{headerIcon}</span>
            <div className="truncate">
              <h2 className="text-xs sm:text-sm font-bold tracking-wider text-[#E8B84A] uppercase truncate">
                {title}
              </h2>
              {subtitle && (
                <div className="text-[7.5px] text-[#94a3b8] mt-0.5 truncate">
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            {headerRight}
            <BrandButton
              variant="secondary"
              onClick={onClose}
              className="px-2.5 py-1 text-[8px] sm:text-[9px] min-h-[30px]"
            >
              [ESC] CERRAR
            </BrandButton>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4.5 bg-[#14101C]">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="px-4 py-2 border-t border-[#8A6A3B]/60 bg-[#100b1b] flex items-center justify-between text-[7px] text-[#94a3b8] shrink-0">
            {footer}
          </div>
        )}
      </BrandPanel>
    </div>
  );
};
