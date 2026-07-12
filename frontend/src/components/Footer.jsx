import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full border-t border-stub bg-white/20 backdrop-blur-md py-16 px-6" aria-label="Waypoint Footer">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
        
        {/* Brand Summary & Social Column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Link to="/" className="inline-block group focus:outline-none focus:ring-2 focus:ring-route/30 rounded-2xl p-1" aria-label="Waypoint Logo Home Link">
            <img
              src="/images/waypoint-logo.png"
              alt="Waypoint Logo"
              className="h-[60px] w-auto object-contain transition-transform duration-200 group-hover:scale-[1.03] mb-1"
            />
          </Link>
          <span className="font-display text-lg font-bold text-ink select-none">Waypoint</span>
          <p className="text-ink/65 text-body-sm leading-relaxed max-w-sm">
            One route. Three ways to get there. Waypoint unifies flights, hotels, and intercity coach lines into a single, transactional, concurrency-safe booking engine.
          </p>
          
          {/* Social Icons with SVG graphic markers */}
          <div className="flex gap-4.5 mt-3">
            {/* Twitter */}
            <a 
              href="https://twitter.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-10 h-10 rounded-xl bg-ink/5 hover:bg-ink/10 text-ink/70 hover:text-route flex items-center justify-center transition-all duration-300 hover:-translate-y-1 active:scale-95 focus:outline-none focus:ring-2 focus:ring-route/30"
              aria-label="Waypoint Twitter profile"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
            {/* LinkedIn */}
            <a 
              href="https://linkedin.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-10 h-10 rounded-xl bg-ink/5 hover:bg-ink/10 text-ink/70 hover:text-route flex items-center justify-center transition-all duration-300 hover:-translate-y-1 active:scale-95 focus:outline-none focus:ring-2 focus:ring-route/30"
              aria-label="Waypoint LinkedIn profile"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
              </svg>
            </a>
            {/* GitHub */}
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-10 h-10 rounded-xl bg-ink/5 hover:bg-ink/10 text-ink/70 hover:text-route flex items-center justify-center transition-all duration-300 hover:-translate-y-1 active:scale-95 focus:outline-none focus:ring-2 focus:ring-route/30"
              aria-label="Waypoint GitHub organization"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.53 1.03 1.53 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div>
          <h4 className="text-label font-semibold text-ink/80 uppercase tracking-wide mb-5">Quick Links</h4>
          <ul className="space-y-3 flex flex-col text-xs font-semibold text-ink/60">
            <li>
              <Link to="/" className="hover:text-route transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-route/30 rounded px-1 py-0.5">
                Home
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-route transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-route/30 rounded px-1 py-0.5">
                About
              </Link>
            </li>
            <li>
              <Link to="/services" className="hover:text-route transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-route/30 rounded px-1 py-0.5">
                Services
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-route transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-route/30 rounded px-1 py-0.5">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Legal */}
        <div>
          <h4 className="text-label font-semibold text-ink/80 uppercase tracking-wide mb-5">Legal</h4>
          <ul className="space-y-3 flex flex-col text-xs font-semibold text-ink/60">
            <li>
              <Link to="/contact" className="hover:text-route transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-route/30 rounded px-1 py-0.5">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-route transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-route/30 rounded px-1 py-0.5">
                Terms of Use
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-route transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-route/30 rounded px-1 py-0.5">
                Cookie Policy
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 4: Resources */}
        <div>
          <h4 className="text-label font-semibold text-ink/80 uppercase tracking-wide mb-5">Resources</h4>
          <ul className="space-y-3 flex flex-col text-xs font-semibold text-ink/60">
            <li>
              <Link to="/contact" className="hover:text-route transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-route/30 rounded px-1 py-0.5">
                FAQs
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-route transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-route/30 rounded px-1 py-0.5">
                Support
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-route transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-route/30 rounded px-1 py-0.5">
                Documentation
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 5: Contact Info */}
        <div className="flex flex-col gap-3.5">
          <h4 className="text-label font-semibold text-ink/80 uppercase tracking-wide mb-1.5">Contact</h4>
          <div className="flex flex-col gap-2 text-xs font-semibold text-ink/60">
            <p className="flex items-center gap-2">
              <span className="text-base select-none">✉️</span>
              <a href="mailto:support@waypoint.com" className="hover:text-route transition-colors focus:outline-none focus:ring-2 focus:ring-route/30 rounded px-1">
                support@waypoint.com
              </a>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-base select-none">📞</span>
              <a href="tel:+18005559297" className="hover:text-route transition-colors focus:outline-none focus:ring-2 focus:ring-route/30 rounded px-1">
                +1 (800) 555-WAYP
              </a>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-base select-none">📍</span>
              <span className="leading-relaxed">
                One Infinite Loop,<br />Cupertino, CA, USA
              </span>
            </p>
          </div>
        </div>

      </div>

      {/* Copyright Line */}
      <div className="max-w-6xl mx-auto border-t border-stub mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-micro text-ink/40 font-semibold select-none">
          © {new Date().getFullYear()} Waypoint Systems. All rights reserved.
        </p>
        <p className="text-micro text-ink/30 font-mono tracking-wider select-none">
          CONCURRENCY-SAFE TRANSACTION ENGINE
        </p>
      </div>
    </footer>
  );
}
