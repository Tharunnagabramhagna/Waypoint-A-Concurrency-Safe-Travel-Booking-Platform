import React from 'react';

export default function Card({ children, className = '', hoverEffect = true, ...props }) {
  return (
    <div
      className={`glass rounded-3xl p-6 ${hoverEffect ? 'hover:shadow-xl hover:-translate-y-1' : ''} transition-all duration-300 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
