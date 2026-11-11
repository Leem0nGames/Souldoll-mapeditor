import React from 'react';

interface TitleScreenProps {
  onPlay: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onPlay }) => (
  <section className="startup-screen fixed inset-0 z-[80] flex items-center justify-center overflow-hidden px-5 py-8 text-[#fdf6e2]">
    <div className="startup-vignette absolute inset-0" />

    <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center">
      <header className="mb-8 flex items-center gap-3 text-[8px] uppercase tracking-[0.3em] text-[#c5b7df] sm:mb-12 sm:text-[10px]">
        <span className="startup-brand-mark flex h-9 w-9 items-center justify-center text-lg text-[#f6d477] sm:h-11 sm:w-11">
          ✦
        </span>
        <span>Una aventura de almas</span>
      </header>

      <div className="startup-title-panel relative flex w-full max-w-3xl flex-col items-center overflow-hidden px-6 py-9 text-center sm:px-12 sm:py-12">
        <div className="startup-orbit startup-orbit-one" aria-hidden="true" />
        <div className="startup-orbit startup-orbit-two" aria-hidden="true" />

        <div className="relative z-10 mb-1 text-[9px] uppercase tracking-[0.45em] text-[#c6a9ff] sm:text-[11px]">
          Crónicas de Luminati
        </div>
        <h1 className="startup-wordmark relative z-10 mt-3 text-4xl font-black uppercase leading-none tracking-[0.08em] sm:text-6xl md:text-7xl">
          <span>SOUL</span>
          <span className="startup-wordmark-accent">DOLLS</span>
        </h1>
        <p className="relative z-10 mt-5 max-w-lg text-[9px] leading-6 tracking-[0.12em] text-[#d3cde0] sm:text-xs">
          Explora un mundo encantado. Encuentra almas. Escribe tu leyenda.
        </p>

        <div className="startup-hero relative z-10 my-5 h-[145px] w-full sm:my-7 sm:h-[190px]" aria-hidden="true">
          <div className="startup-hero-glow" />
          <div className="startup-hero-rune">✦</div>
          <div className="startup-player-sprite" />
          <div className="startup-hero-caption">El viaje comienza aquí</div>
        </div>

        <button
          type="button"
          onClick={onPlay}
          className="startup-play-button relative z-10 min-h-12 w-full max-w-xs px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#fff5cf] transition duration-200 hover:-translate-y-0.5 hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f8d77b] active:translate-y-0 sm:text-xs"
        >
          <span className="mr-3 text-[#f8d77b]">▶</span>
          Comenzar aventura
        </button>

        <div className="relative z-10 mt-6 text-[7px] uppercase tracking-[0.18em] text-[#8f83a7] sm:text-[8px]">
          RPG de exploración · Pixel art · Combate táctico
        </div>
      </div>

      <footer className="mt-6 text-center text-[7px] tracking-[0.12em] text-[#9b91ab] sm:mt-8 sm:text-[8px]">
        SOULDOLLS <span className="mx-2 text-[#8066b2]">✦</span> VILLA MARIONETA TE ESPERA
      </footer>
    </div>
  </section>
);
