import React from 'react';

export default function Input({ className = '', label, ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="text-label font-semibold text-ink/60 uppercase tracking-wide mb-2 block">
          {label}
        </label>
      )}
      <input
        className={`w-full glass px-4 py-3 rounded-2xl text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-route/30 focus:border-route/50 transition-all duration-300 ${className}`}
        {...props}
      />
    </div>
  );
}
