import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer when pressing escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setMobileMenuOpen(false);
      navigate('/');
    }
  }

  const isActive = (path, search = '') => {
    if (search) {
      return location.pathname === path && location.search.includes(search);
    }
    return location.pathname === path;
  };

  const navLinks = [
    { name: 'Home', path: '/', active: isActive('/') },
    { name: 'Explore', path: '/explore', active: isActive('/explore') },
    { name: 'About', path: '/about', active: isActive('/about') },
    { name: 'Services', path: '/services', active: isActive('/services') },
    { name: 'Contact', path: '/contact', active: isActive('/contact') },
  ];

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 w-full ${
        isScrolled ? 'py-3 px-4 shadow-sm backdrop-blur-md' : 'py-6 px-6'
      }`}
    >
      <div className="max-w-6xl mx-auto">
        <nav 
          className={`glass rounded-3xl transition-all duration-300 flex items-center justify-between px-6 h-[72px] ${
            isScrolled ? 'shadow-md bg-white/80 border-white/50' : 'shadow-sm border-white/20'
          }`}
          aria-label="Global navigation"
        >
          {/* Left Column: Brand Logo */}
          <div className="flex-1 flex justify-start">
            <Link 
              to="/" 
              className="flex items-center gap-3.5 group focus:outline-none focus:ring-2 focus:ring-route/30 rounded-2xl p-1"
              aria-label="Waypoint Home"
            >
              <img
                src="/images/waypoint-logo.png"
                alt="Waypoint Logo"
                className="h-11 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.03]"
              />
              <div className="flex flex-col">
                <span className="font-display text-xl font-bold tracking-tight text-ink">
                  Waypoint
                </span>
                <span className="text-[10px] text-route tracking-wider font-semibold uppercase">Route System</span>
              </div>
            </Link>
          </div>

          {/* Center Column: Centered Nav Links */}
          <div className="hidden md:flex items-center justify-center gap-1.5">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.search ? `${link.path}?${link.search}` : link.path}
                className={`relative px-4 py-2 rounded-xl text-body-sm font-semibold tracking-wide transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-route/30 ${
                  link.active 
                    ? 'text-route bg-route/5' 
                    : 'text-ink/70 hover:text-ink hover:bg-white/50'
                }`}
              >
                {link.name}
                {link.active && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-route transition-all"></span>
                )}
              </Link>
            ))}

            {user && (
              <Link
                to="/bookings"
                className={`relative px-4 py-2 rounded-xl text-body-sm font-semibold tracking-wide transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-route/30 ${
                  isActive('/bookings') 
                    ? 'text-route bg-route/5' 
                    : 'text-ink/70 hover:text-ink hover:bg-white/50'
                }`}
              >
                My Bookings
                {isActive('/bookings') && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-route transition-all"></span>
                )}
              </Link>
            )}
          </div>

          {/* Right Column: CTA Buttons */}
          <div className="hidden md:flex items-center justify-end flex-1 gap-3">
            {user ? (
              <>
                <span className="text-body-sm font-semibold text-ink/70 mr-1 select-none">
                  Hi, {user.name || user.email.split('@')[0]}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn-secondary py-2.5 px-5 text-meta uppercase tracking-wide active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-route/30"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn-secondary py-2.5 px-5 text-meta uppercase tracking-wide active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-route/30"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn-primary py-2.5 px-5 text-meta uppercase tracking-wide active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-route/30"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-white/50 text-ink focus:outline-none focus:ring-2 focus:ring-route/30"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div 
            id="mobile-menu"
            className="md:hidden mt-2 glass rounded-3xl p-5 shadow-lg flex flex-col gap-2 bg-white/90 border border-white/40 animate-fade-up"
          >
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.search ? `${link.path}?${link.search}` : link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-body-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-route/30 ${
                  link.active 
                    ? 'text-route bg-route/5' 
                    : 'text-ink/70 hover:text-ink hover:bg-white/50'
                }`}
              >
                {link.name}
              </Link>
            ))}

            {user && (
              <Link
                to="/bookings"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-body-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-route/30 ${
                  isActive('/bookings') 
                    ? 'text-route bg-route/5' 
                    : 'text-ink/70 hover:text-ink hover:bg-white/50'
                }`}
              >
                My Bookings
              </Link>
            )}

            <div className="h-px bg-ink/10 my-2"></div>

            {user ? (
              <button
                onClick={handleLogout}
                className="w-full text-center bg-ink/5 hover:bg-ink/10 text-ink font-semibold py-3 px-5 rounded-2xl text-meta uppercase tracking-wide transition-all duration-200 cursor-pointer active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-route/30"
              >
                Sign Out
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center btn-secondary py-3 px-5 text-meta uppercase tracking-wide active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-route/30"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center btn-primary py-3 px-5 text-meta uppercase tracking-wide active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-route/30"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
