import React, { useEffect, useRef, useState } from 'react';

/**
 * SplashScreen — Premium Waypoint Startup Experience.
 *
 * Design Philosophy:
 * CALM → ANTICIPATION → ARRIVAL → CONFIDENCE → REVEAL
 *
 * Carefully timed sequence with intentional rhythm, physical motion,
 * and high restraint (Apple / Linear / Airbnb level finish).
 *
 * Timeline (Total ~3.4s):
 * 0.0s – 0.5s : Quiet, luminous off-white glassmorphic atmosphere + subtle ambient micro-particles.
 * 0.5s – 1.7s : Airplane smoothly flies along curved trajectory, rotates naturally, decelerates toward center.
 * 1.7s – 1.95s: Micro-pause & soft luminous docking into the logo center with single delicate ripple.
 * 1.95s – 2.35s: Logo hero emergence with controlled physical weight (scale 0.72 -> 1.08 -> 0.99 -> 1.0).
 * 2.35s – 2.85s: Brief rest, then logo gracefully shifts left while "Waypoint" title smoothly reveals from right.
 * 2.85s – 3.15s: Complete brand lockup settles with perfect optical balance & very faint ambient light breath.
 * 3.15s – 3.50s: Calm, luxurious dissolve into the application.
 */
export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState('initial'); // 'initial' | 'flying' | 'docking' | 'popped' | 'lockup' | 'settled' | 'exiting'
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    // ── Reduced Motion Accessibility ──
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setPhase('settled');
      const timer = setTimeout(() => {
        setPhase('exiting');
        setTimeout(() => onComplete?.(), 400);
      }, 1200);
      return () => clearTimeout(timer);
    }

    // ── Orchestrated Timeline with Rhythm & Contrast ──
    const tFlight = setTimeout(() => setPhase('flying'), 450);
    const tDocking = setTimeout(() => {
      setPhase('docking');
      triggerSubtleDockShimmer();
    }, 1680);
    const tPopped = setTimeout(() => setPhase('popped'), 1980);
    const tLockup = setTimeout(() => setPhase('lockup'), 2380);
    const tSettle = setTimeout(() => setPhase('settled'), 2820);
    const tExit = setTimeout(() => setPhase('exiting'), 3150);
    const tDone = setTimeout(() => onComplete?.(), 3500);

    // ── Restrained, High-Quality Particle Canvas ──
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Sophisticated, muted Waypoint color accents
    const palette = [
      '#0EA5E9', // Sky Cyan
      '#0284C7', // Deep Cyan/Blue
      '#2F6F5E', // Waypoint Route Green/Teal
      '#06B6D4', // Teal
      '#10B981', // Soft Emerald
    ];

    // Helper: spawn a delicate light point
    const createParticle = (opts = {}) => {
      const isSparkle = opts.isSparkle ?? Math.random() < 0.22; // 78% soft dots, 22% delicate sparkles
      const angle = opts.angle ?? Math.random() * Math.PI * 2;
      const speed = opts.speed ?? (0.15 + Math.random() * 0.45);
      return {
        x: opts.x ?? width / 2 + (Math.random() - 0.5) * (opts.spreadX ?? 240),
        y: opts.y ?? height / 2 + (Math.random() - 0.5) * (opts.spreadY ?? 200),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: opts.size ?? (isSparkle ? 1.8 + Math.random() * 1.6 : 1.2 + Math.random() * 1.5),
        color: palette[Math.floor(Math.random() * palette.length)],
        alpha: opts.alpha ?? (0.25 + Math.random() * 0.35),
        decay: opts.decay ?? (0.002 + Math.random() * 0.003),
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.03 + Math.random() * 0.04,
        isSparkle,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.015,
      };
    };

    // Initial calm ambient particles (restrained count: ~28)
    particlesRef.current = Array.from({ length: 28 }, () =>
      createParticle({
        spreadX: 280,
        spreadY: 220,
        speed: 0.1 + Math.random() * 0.35,
        alpha: 0.2 + Math.random() * 0.35,
      })
    );

    // Subtle docking shimmer (gentle pulse of ~14 particles, NOT an explosion)
    function triggerSubtleDockShimmer() {
      for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.8 + Math.random() * 1.4;
        particlesRef.current.push(
          createParticle({
            x: width / 2 + (Math.random() - 0.5) * 15,
            y: height / 2 + (Math.random() - 0.5) * 15,
            angle,
            speed,
            size: 1.6 + Math.random() * 1.6,
            alpha: 0.55 + Math.random() * 0.25,
            decay: 0.005 + Math.random() * 0.004,
            isSparkle: Math.random() < 0.35,
          })
        );
      }
    }

    let lastFlightEmit = 0;
    const startTime = performance.now();

    const render = (now) => {
      const elapsed = (now - startTime) / 1000;
      ctx.clearRect(0, 0, width, height);

      // During flight (0.5s – 1.65s), emit tiny soft accents along the trajectory
      if (elapsed >= 0.5 && elapsed <= 1.65 && now - lastFlightEmit > 110) {
        lastFlightEmit = now;
        const progress = Math.min(1, Math.max(0, (elapsed - 0.5) / 1.15));
        const p0x = width * 0.15;
        const p0y = height * 0.82;
        const p1x = width * 0.34;
        const p1y = height * 0.44;
        const p2x = width * 0.5;
        const p2y = height * 0.5;

        const curX = Math.pow(1 - progress, 2) * p0x + 2 * (1 - progress) * progress * p1x + Math.pow(progress, 2) * p2x;
        const curY = Math.pow(1 - progress, 2) * p0y + 2 * (1 - progress) * progress * p1y + Math.pow(progress, 2) * p2y;

        particlesRef.current.push(
          createParticle({
            x: curX + (Math.random() - 0.5) * 16,
            y: curY + (Math.random() - 0.5) * 16,
            speed: 0.15 + Math.random() * 0.4,
            size: 1.2 + Math.random() * 1.4,
            alpha: 0.45,
            decay: 0.006,
            isSparkle: Math.random() < 0.25,
          })
        );
      }

      // Maintain a gentle background shimmer until exit
      if (elapsed < 2.9 && particlesRef.current.length < 32 && Math.random() < 0.15) {
        particlesRef.current.push(
          createParticle({
            spreadX: 300,
            spreadY: 220,
            speed: 0.1 + Math.random() * 0.3,
            alpha: 0.25 + Math.random() * 0.25,
          })
        );
      }

      // Update & Draw
      const pool = particlesRef.current;
      for (let i = pool.length - 1; i >= 0; i--) {
        const p = pool[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.twinkle += p.twinkleSpeed;
        p.rotation += p.rotSpeed;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          pool.splice(i, 1);
          continue;
        }

        const dynamicAlpha = Math.min(1, Math.max(0, p.alpha * (0.75 + 0.25 * Math.sin(p.twinkle))));

        ctx.save();
        ctx.globalAlpha = dynamicAlpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.isSparkle ? 6 : 3;

        if (p.isSparkle) {
          // Delicate 4-point star sparkle (✦)
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.beginPath();
          const outer = p.size * 1.5;
          const inner = p.size * 0.3;
          ctx.moveTo(0, -outer);
          ctx.lineTo(inner, -inner);
          ctx.lineTo(outer, 0);
          ctx.lineTo(inner, inner);
          ctx.lineTo(0, outer);
          ctx.lineTo(-inner, inner);
          ctx.lineTo(-outer, 0);
          ctx.lineTo(-inner, -inner);
          ctx.closePath();
          ctx.fill();
        } else {
          // Soft ambient circular light dot
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (elapsed < 3.4) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      clearTimeout(tFlight);
      clearTimeout(tDocking);
      clearTimeout(tPopped);
      clearTimeout(tLockup);
      clearTimeout(tSettle);
      clearTimeout(tExit);
      clearTimeout(tDone);
    };
  }, [onComplete]);

  const isLockupStage = phase === 'lockup' || phase === 'settled' || phase === 'exiting';
  const isPostDock = phase === 'popped' || isLockupStage;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden transition-opacity select-none ${
        phase === 'exiting' ? 'opacity-0 duration-400 ease-out pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(ellipse 120% 100% at 50% 46%, #FFFFFF 0%, #FAFBFD 45%, #F4F6F9 80%, #EAEFF4 100%)',
      }}
      role="status"
      aria-label="Waypoint Loading"
    >
      {/* ── Background Atmosphere: Frosted White Depth + Subtle Central Warmth ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft, focused central depth glow — guides the eye to center without harsh blobs */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full blur-3xl transition-opacity duration-1000 pointer-events-none ${
            isPostDock ? 'opacity-50' : 'opacity-30'
          }`}
          style={{
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.14) 0%, rgba(47, 111, 94, 0.06) 50%, transparent 70%)',
          }}
        />

        {/* Very subtle ambient off-center glow for organic depth */}
        <div
          className="absolute top-[20%] right-[18%] w-[380px] h-[380px] rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 65%)',
          }}
        />
      </div>

      {/* Canvas Particle Layer */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* ── Airplane Contrail (Natural Curved Dashed Brand Gradient) ── */}
      {phase === 'flying' && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1000 600"
          preserveAspectRatio="none"
        >
          <path
            d="M 130 535 C 275 425, 410 330, 500 300"
            fill="none"
            stroke="url(#contrail-grad)"
            strokeWidth="2.2"
            strokeDasharray="5 7"
            className="animate-contrail-draw"
          />
          <defs>
            <linearGradient id="contrail-grad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0" />
              <stop offset="40%" stopColor="#0EA5E9" stopOpacity="0.45" />
              <stop offset="85%" stopColor="#0284C7" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#2F6F5E" stopOpacity="0.85" />
            </linearGradient>
          </defs>
        </svg>
      )}

      {/* ── Visual Brand Center Stage ── */}
      <div className="relative z-10 flex items-center justify-center px-4">
        {/* ── Single Elegant Luminous Docking Ripple ── */}
        {(phase === 'docking' || phase === 'popped') && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-56 sm:h-56 rounded-full border border-sky-400/35 pointer-events-none animate-dock-ripple"
            style={{
              boxShadow: '0 0 28px rgba(14, 165, 233, 0.22), inset 0 0 16px rgba(6, 182, 212, 0.15)',
            }}
          />
        )}

        {/* ── Airplane Element (Physical Curved Deceleration) ── */}
        {phase === 'flying' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-flight-curve">
            <div className="relative -top-2.5 -left-2.5 drop-shadow-[0_4px_14px_rgba(14,165,233,0.35)]">
              <svg
                width="42"
                height="42"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21 3.5C20.5 3 18.5 3.5 17 5L13.5 8.5L5.3 6.7C4.4 6.5 3.7 7 3.7 7.9L3.5 11L10.2 14.5L6.7 18L4.3 17.4C3.8 17.3 3.2 17.6 3.1 18.1L2.8 19L6.3 20.8L8.1 24.3L9 24C9.5 23.9 9.8 23.3 9.7 22.8L9.1 20.4L12.6 16.9L16.1 23.6C17 23.6 17.5 22.9 17.3 22L17.1 18.9L20.6 15.4C22.1 13.9 22.6 11.9 22.1 11.4C21.6 10.9 19.6 11.4 18.1 12.9L16.2 14.8L16.6 9L19.5 6.1C21 4.6 21.5 4 21 3.5Z"
                  fill="url(#restrained-plane-grad)"
                  stroke="#FFFFFF"
                  strokeWidth="0.8"
                />
                <defs>
                  <linearGradient id="restrained-plane-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#06B6D4" />
                    <stop offset="0.35" stopColor="#0EA5E9" />
                    <stop offset="0.75" stopColor="#0284C7" />
                    <stop offset="1" stopColor="#2F6F5E" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        )}

        {/* ── Brand Lockup Group: Optically Centered [ LOGO ] Waypoint ── */}
        <div className="relative flex items-center justify-center">
          {/* Faint Ambient Light Breath across settled lockup */}
          {phase === 'settled' && (
            <div className="absolute inset-0 -inset-x-6 rounded-2xl overflow-hidden pointer-events-none z-20">
              <div className="w-full h-full animate-ambient-breath bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            </div>
          )}

          {/* Waypoint Logo Mark — Physically Grounded Hero Emergence */}
          <div
            className={`relative flex items-center justify-center shrink-0 transition-all ${
              phase === 'initial' || phase === 'flying'
                ? 'opacity-25 scale-[0.72] blur-[1px]'
                : phase === 'docking'
                ? 'opacity-85 scale-[0.85]'
                : phase === 'popped'
                ? 'opacity-100 animate-logo-emergence'
                : 'opacity-100 scale-100'
            }`}
          >
            <img
              src="/images/waypoint-logo.png"
              alt="Waypoint Logo"
              className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 object-contain drop-shadow-[0_8px_20px_rgba(14,165,233,0.18)] transition-transform duration-500"
            />
          </div>

          {/* "Waypoint" Brand Typography — Restrained, Confident Slide-in */}
          <div
            className={`flex items-center overflow-hidden transition-all duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isLockupStage
                ? 'max-w-[360px] opacity-100 ml-3.5 sm:ml-5 md:ml-6 translate-x-0 scale-100'
                : 'max-w-0 opacity-0 ml-0 translate-x-6 scale-[0.98] pointer-events-none'
            }`}
          >
            <span className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[#12172A] leading-none whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              Waypoint
            </span>
          </div>
        </div>
      </div>

      {/* Refined Motion Styles */}
      <style>{`
        /* Smooth, physical flight trajectory with deceleration */
        @keyframes flightCurve {
          0% {
            transform: translate3d(-52vw, 48vh, 0) rotate(16deg) scale(0.6);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          60% {
            transform: translate3d(-14vw, 9vh, 0) rotate(38deg) scale(0.9);
          }
          88% {
            transform: translate3d(1.5vw, -1.5vh, 0) rotate(44deg) scale(0.98);
          }
          100% {
            transform: translate3d(0, 0, 0) rotate(45deg) scale(1);
            opacity: 0.15;
          }
        }

        /* Controlled, physical logo emergence (restrained overshoot: 1.08 max) */
        @keyframes logoEmergence {
          0% {
            transform: scale(0.72);
            opacity: 0.5;
            filter: blur(1.5px);
          }
          50% {
            transform: scale(1.08);
            opacity: 1;
            filter: blur(0px);
          }
          80% {
            transform: scale(0.99);
            filter: blur(0px);
          }
          100% {
            transform: scale(1.0);
            opacity: 1;
            filter: blur(0px);
          }
        }

        /* Single, delicate luminous ripple */
        @keyframes dockRipple {
          0% {
            transform: translate(-50%, -50%) scale(0.4);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.6);
            opacity: 0;
          }
        }

        /* Contrail Drawing */
        @keyframes contrailDraw {
          0% {
            stroke-dashoffset: 400;
            opacity: 0;
          }
          20% {
            opacity: 0.9;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 0.7;
          }
        }

        /* Very faint ambient light breath */
        @keyframes ambientBreath {
          0% {
            transform: translateX(-120%) skewX(-15deg);
            opacity: 0;
          }
          40% {
            opacity: 0.35;
          }
          100% {
            transform: translateX(130%) skewX(-15deg);
            opacity: 0;
          }
        }

        .animate-flight-curve {
          animation: flightCurve 1.25s cubic-bezier(0.25, 1, 0.35, 1) forwards;
          will-change: transform, opacity;
        }

        .animate-logo-emergence {
          animation: logoEmergence 0.45s cubic-bezier(0.22, 1.2, 0.36, 1) forwards;
          will-change: transform, opacity;
        }

        .animate-dock-ripple {
          animation: dockRipple 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity;
        }

        .animate-contrail-draw {
          animation: contrailDraw 1.25s ease-out forwards;
        }

        .animate-ambient-breath {
          animation: ambientBreath 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity;
        }
      `}</style>
    </div>
  );
}
