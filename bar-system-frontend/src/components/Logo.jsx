import React from 'react';

// Logo "BAR COLORES" recreado del menú: neón blanco + letra de brocha con degradado arcoíris
export default function Logo() {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '18px 32px 20px',
        borderRadius: '9999px',
        border: '2px solid var(--bg-card-border)',
        backgroundColor: 'var(--bg-card)',
        boxShadow: '0 0 30px rgba(255, 46, 151, 0.15), 0 0 30px rgba(63, 107, 255, 0.15) inset',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '34px',
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: '0.35em',
          marginRight: '-0.35em',
          color: '#fff',
          textShadow: '0 0 6px #fff, 0 0 14px var(--neon-pink), 0 0 26px var(--neon-purple)',
        }}
      >
        BAR
      </span>

      <span
        style={{
          fontFamily: 'var(--font-brush)',
          fontSize: 'clamp(44px, 6vw, 68px)',
          lineHeight: 1.05,
          transform: 'skewX(-8deg)',
          background: 'var(--rainbow)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 10px rgba(255, 46, 151, 0.45)) drop-shadow(0 0 18px rgba(63, 107, 255, 0.35))',
        }}
      >
        COLORES
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
        <span style={{ width: '32px', height: '2px', background: 'var(--neon-pink)', boxShadow: '0 0 8px var(--neon-pink)' }} />
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '16px',
            fontWeight: 500,
            letterSpacing: '0.18em',
            color: '#fff',
          }}
        >
          SABORES QUE ILUMINAN LA NOCHE
        </span>
        <span style={{ width: '32px', height: '2px', background: 'var(--neon-blue)', boxShadow: '0 0 8px var(--neon-blue)' }} />
      </div>
    </div>
  );
}
