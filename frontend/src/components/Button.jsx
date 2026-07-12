import React from 'react';

export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const baseStyle = "font-semibold py-3 px-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 active:scale-[0.98] text-sm inline-flex items-center justify-center gap-2 cursor-pointer";
  const variants = {
    primary: "bg-route text-white hover:bg-route-dark",
    secondary: "glass text-ink hover:bg-white/60",
    amber: "bg-signal text-white hover:bg-amber-600",
    danger: "bg-red-500 text-white hover:bg-red-600",
  };
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
