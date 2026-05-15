'use client';

import React from 'react';
import { FIRE_CLASS_REFERENCE_LINES, fireClassLineIndicesForType } from '@/lib/fireClassReference';

type Props = {
  type: string;
  /** Tighter padding for small modals */
  compact?: boolean;
};

/** Full 1–7 class legend; highlights row(s) matching `type` from the register dropdown. */
export default function FireClassReferenceBlock({ type, compact }: Props) {
  const highlight = fireClassLineIndicesForType(type);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: compact ? '100%' : 420,
        marginTop: compact ? 0 : undefined,
        padding: compact ? '0.75rem 0.85rem' : '0.85rem 1rem',
        background: 'var(--bg-main, #f4f6f8)',
        borderRadius: 12,
        border: '1px solid var(--border-color, rgba(0,0,0,0.08)',
        textAlign: 'left',
      }}
    >
      <p
        style={{
          margin: '0 0 0.5rem',
          fontSize: compact ? '0.72rem' : '0.76rem',
          fontWeight: 700,
          color: 'var(--color-secondary, #0b1b2b)',
          letterSpacing: '0.03em',
        }}
      >
        Fire extinguisher class reference
      </p>
      <p
        style={{
          margin: '0 0 0.45rem',
          fontSize: compact ? '0.68rem' : '0.72rem',
          color: 'var(--text-muted)',
        }}
      >
        Type on record:{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{type.trim() || '—'}</strong>
        {highlight.size > 0 ? (
          <span style={{ fontWeight: 500 }}> · highlighted row(s) apply to this unit</span>
        ) : null}
      </p>
      <ol
        style={{
          margin: 0,
          paddingLeft: '1.2rem',
          fontSize: compact ? '0.7rem' : '0.74rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.48,
        }}
      >
        {FIRE_CLASS_REFERENCE_LINES.map((line, i) => {
          const n = i + 1;
          const isHi = highlight.has(n);
          return (
            <li
              key={line}
              style={{
                fontWeight: isHi ? 650 : 400,
                color: isHi ? 'var(--color-primary, #007a53)' : undefined,
                padding: isHi ? '0.12rem 0' : undefined,
              }}
            >
              {line}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
