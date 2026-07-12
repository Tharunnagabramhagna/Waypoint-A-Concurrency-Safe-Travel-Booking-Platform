import React from 'react';

export default function Badge({ children, variant = 'primary', className = '' }) {
  const baseStyle = "px-3 py-1 rounded-full text-label font-semibold uppercase inline-block tracking-wide";
  const variants = {
    primary: "bg-route/10 text-route",
    secondary: "bg-ink/10 text-ink",
    amber: "bg-signal/10 text-signal",
    danger: "bg-red-500/10 text-red-500",
  };
  return (
    <span className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
