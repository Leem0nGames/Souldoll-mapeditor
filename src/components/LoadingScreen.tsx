import React from 'react';

interface LoadingScreenProps {
  progress: number;
  error: string | null;
  onRetry: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, error, onRetry }) => (
  <section
    className="startup-screen fixed inset-0 z-[90] flex items-center justify-center overflow-hidden px-6 py-8 text-center text-[#fdf6e2]"
    aria-live="polite"
  >
    <div className="startup-vignette absolute inset-0" />
    <div className="startup-loading-panel relative w-full max-w-md px-7 py-9 sm:px-12 sm:py-12">
      <div className="startup-loader-sigil mx-auto mb-6 flex h-16 w-16 items-center justify-center text-3xl text-[#f6d477]">
        ✦
      </div>
      <p className="text-[8px] uppercase tracking-[0.35em] text-[#b8a1e8]">Crónicas de Luminati</p>
      <h1 className="startup-wordmark mt-3 text-3xl font-black tracking-[0.08em] sm:text-4xl">
        SOUL<span className="startup-wordmark-accent">DOLLS</span>
      </h1>

      {error ? (
        <div className="mt-8">
          <p className="text-[9px] leading-5 text-[#ffc3c3] sm:text-[10px]">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="startup-play-button mt-6 min-h-11 px-6 py-3 text-[9px] font-bold uppercase tracking-[0.16em] text-[#fff5cf] transition hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f8d77b]"
          >
            Reintentar carga
          </button>
        </div>
      ) : (
        <div className="mt-9">
          <div className="mb-3 flex items-center justify-between text-[8px] uppercase tracking-[0.16em] text-[#b8accb]">
            <span>Preparando tu aventura</span>
            <span>{progress}%</span>
          </div>
          <div
            className="startup-progress-track h-2 overflow-hidden"
            role="progressbar"
            aria-label="Carga de recursos del juego"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="startup-progress-fill h-full transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-5 text-[7px] tracking-[0.12em] text-[#827791]">Cargando mundo, personajes y almas…</p>
        </div>
      )}
    </div>
  </section>
);
