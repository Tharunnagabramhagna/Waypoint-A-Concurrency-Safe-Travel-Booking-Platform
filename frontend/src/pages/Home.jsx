import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card.jsx';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';

const TYPES = [
  {
    key: 'flight',
    label: 'Flights',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5C20.5 3 18.5 3.5 17 5L13.5 8.5L5.3 6.7c-.9-.2-1.6.3-1.6 1.2l-.2 3.1l6.7 3.5l-3.5 3.5l-2.4-.6c-.5-.1-1.1.2-1.2.7l-.3.9l3.5 1.8l1.8 3.5l.9-.3c.5-.1.8-.7.7-1.2l-.6-2.4l3.5-3.5l3.5 6.7c.9 0 1.4-.7 1.2-1.6l-.2-3.1z" />
      </svg>
    )
  },
  {
    key: 'hotel',
    label: 'Hotels',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <line x1="9" y1="22" x2="9" y2="16" />
        <line x1="15" y1="22" x2="15" y2="16" />
        <line x1="9" y1="16" x2="15" y2="16" />
        <path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M8 10h.01" /><path d="M16 10h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" />
      </svg>
    )
  },
  {
    key: 'bus',
    label: 'Buses',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
        <path d="M7 12h10" /><path d="M9 6v4" />
      </svg>
    )
  }
];

const DESTINATIONS = [
  { name: 'Bengaluru', country: 'India', img: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=400&q=80', tag: 'Tech Hub' },
  { name: 'Delhi', country: 'India', img: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=400&q=80', tag: 'Historical' },
  { name: 'Paris', country: 'France', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80', tag: 'Romantic' },
  { name: 'Tokyo', country: 'Japan', img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80', tag: 'Futuristic' },
  { name: 'Cairo', country: 'Egypt', img: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=400&q=80', tag: 'Historical' },
  { name: 'Maldives', country: 'Asia', img: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=400&q=80', tag: 'Tropical' },
  { name: 'New York City', country: 'USA', img: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=400&q=80', tag: 'Urban' },
  { name: 'Cape Town', country: 'South Africa', img: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=400&q=80', tag: 'Adventure' },
  { name: 'Rome', country: 'Italy', img: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=400&q=80', tag: 'Ancient' },
  { name: 'Rio de Janeiro', country: 'Brazil', img: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=400&q=80', tag: 'Vibrant' },
  { name: 'Kyoto', country: 'Japan', img: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=400&q=80', tag: 'Scenic' },
  { name: 'Dubai', country: 'UAE', img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=400&q=80', tag: 'Desert' },
];

const REVIEWS = [
  { name: 'Sarah Jenkins', role: 'Business Traveler', text: 'Being able to hold a flight and hotel room simultaneously without double booking concerns is a game-changer. The 10-minute hold is more than enough time to secure approval.', avatar: '👩‍💼' },
  { name: 'Rahul Mehta', role: 'Frequent Flyer', text: 'Waypoint solved my biggest headache: app juggling. I booked my flight from BLR to DEL and matching hotel stay in under 3 minutes. Zero stress, seamless flow.', avatar: '👨‍💻' },
];

export default function Home() {
  const [type, setType] = useState('flight');
  const [form, setForm] = useState({ origin: '', destination: '', city: '', date: '' });
  const navigate = useNavigate();
  const activeType = TYPES.find((t) => t.key === type);
  const [visibleCount, setVisibleCount] = useState(8);

  // AI Planner UI Mock State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [planning, setPlanning] = useState(false);

  function submit(e) {
    e.preventDefault();
    const params = new URLSearchParams({ type });
    if (activeType.key === 'hotel' && form.city) params.set('city', form.city);
    if (['flight', 'bus'].includes(activeType.key)) {
      if (form.origin) params.set('origin', form.origin);
      if (form.destination) params.set('destination', form.destination);
    }
    if (form.date) params.set('date', form.date);
    navigate(`/search?${params.toString()}`);
  }

  function handleAiPlan(e) {
    e.preventDefault();
    if (!aiPrompt) return;
    setPlanning(true);
    setTimeout(() => {
      setPlanning(false);
      setAiSuggestions([
        {
          type: '✈️ Flight Recommendation',
          title: 'Indigo 404 · BLR to DEL',
          price: '₹4,500.00',
          match: '98% match with your budget schedule',
        },
        {
          type: '🏨 Stays Recommendation',
          title: 'The Grand Palace Delhi (3 Nights)',
          price: '₹12,000.00',
          match: 'Highly rated for short business stays',
        },
      ]);
    }, 1500);
  }

  function scrollToSearch() {
    document.getElementById('search-widget')?.scrollIntoView({ behavior: 'smooth' });
  }

  function scrollToHowItWorks() {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  }

  function scrollToDestinations() {
    document.getElementById('trending-routes')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="pb-24 space-y-24">
      {/* 1. Premium Hero Section */}
      <section
        className="relative rounded-[2.5rem] overflow-hidden min-h-[85vh] lg:min-h-[90vh] grid grid-cols-1 lg:grid-cols-2 items-center gap-8 px-8 md:px-16 shadow-2xl border border-white/10"
      >
        {/* Hero Background Image - centered, cover, eager-loaded, non-distorted */}
        <img
          src="/images/hero_travel_bg.png"
          alt="Waypoint Travel Journey"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none z-0 select-none"
          loading="eager"
        />

        {/* Apple Liquid Glass style frosted-glass blur layer */}
        <div className="absolute inset-0 backdrop-blur-[2.5px] bg-ink/10 pointer-events-none z-0"></div>

        {/* Navy Gradient Overlay (Approx. 45-60% opacity for high readability without overly darkening the image) */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/75 via-ink/60 to-ink/45 pointer-events-none z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink/20 via-transparent to-ink/15 pointer-events-none z-0"></div>

        {/* Soft Radial Glow from the top-right corner using route-green accent color */}
        <div className="absolute top-0 right-0 w-[55%] h-[55%] bg-route/15 blur-[120px] rounded-full pointer-events-none z-0"></div>

        {/* Left Column: Headline and Trust Row */}
        <div className="relative z-10 text-left text-white py-12 flex flex-col justify-center animate-fade-up">
          <Badge variant="amber" className="mb-4 w-fit select-none">
            ✈ Trusted by Modern Travelers
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display leading-tight text-white mb-6 tracking-tight select-none">
            One Journey.<br />
            Every Booking.<br />
            <span className="text-route">One Platform.</span>
          </h1>
          <p className="text-white/80 text-body leading-relaxed max-w-xl mb-8 select-none">
            Search flights, hotels, and buses in one place. Reserve your booking securely, compare prices instantly, and complete your journey with confidence.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap gap-4 mb-8">
            <Button onClick={scrollToSearch} variant="primary" className="px-8 py-3.5 shadow-lg active:scale-[0.97] transition-all">
              Search Trips
            </Button>
            <Button onClick={scrollToDestinations} variant="secondary" className="px-8 py-3.5 bg-white/10 hover:bg-white/20 border-white/20 text-white active:scale-[0.97] transition-all">
              Explore Destinations
            </Button>
          </div>

          {/* Compact Trust Row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-white/80 text-xs font-semibold select-none border-t border-white/10 pt-6 mt-4">
            <span className="flex items-center gap-1.5"><span className="text-route font-bold">✓</span> Secure Payments</span>
            <span className="flex items-center gap-1.5"><span className="text-route font-bold">✓</span> Instant Booking</span>
            <span className="flex items-center gap-1.5"><span className="text-route font-bold">✓</span> 24/7 Support</span>
            <span className="flex items-center gap-1.5"><span className="text-route font-bold">✓</span> No Hidden Fees</span>
          </div>

          {/* Popular Destinations Chips */}
          <div className="flex flex-wrap items-center gap-2 mt-5">
            <span className="text-white/60 text-micro font-semibold uppercase tracking-wider mr-1 select-none">Popular:</span>
            {['Goa', 'Manali', 'Dubai', 'Bali'].map((d) => (
              <span
                key={d}
                onClick={scrollToDestinations}
                className="glass px-3.5 py-1 rounded-full text-xs font-semibold text-white/95 cursor-pointer hover:bg-white/20 hover:-translate-y-[1px] active:scale-95 transition-all duration-200 shadow-sm"
              >
                {d}
              </span>
            ))}
          </div>
        </div>

        {/* Right Column: Layered Glass Showcase (Visual UI Only) */}
        <div className="hidden lg:flex flex-col relative w-full h-[480px] justify-center items-center z-10">
          {/* Subtle Ambient Glow */}
          <div className="absolute w-[300px] h-[300px] bg-route/20 blur-[90px] rounded-full"></div>

          {/* Card 1: Flight Card (Floating top left) */}
          <div className="absolute top-[10%] left-[5%] glass rounded-2xl p-4 shadow-lg w-60 border border-white/30 transform hover:-translate-y-1 hover:scale-102 transition-all duration-300 animate-float select-none">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-route flex items-center gap-1">✈ Flight</span>
              <span className="text-micro bg-route/10 text-route px-2 py-0.5 rounded-full font-mono uppercase font-bold">BLR → DEL</span>
            </div>
            <div className="flex justify-between items-baseline mt-2">
              <span className="text-micro text-ink/65 font-medium">One-way base fare</span>
              <span className="text-lg font-bold text-ink">₹5,249</span>
            </div>
          </div>

          {/* Card 2: Hotel Card (Floating center right) */}
          <div className="absolute top-[35%] right-[5%] glass rounded-2xl p-4 shadow-lg w-60 border border-white/30 transform hover:-translate-y-1 hover:scale-102 transition-all duration-300 animate-float select-none" style={{ animationDelay: '1.2s' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-signal flex items-center gap-1">🏨 Hotel</span>
              <span className="text-micro bg-signal/10 text-signal px-2 py-0.5 rounded-full font-mono uppercase font-bold">Standard</span>
            </div>
            <h4 className="font-bold text-xs text-ink mb-1">Taj Palace Resort</h4>
            <div className="flex justify-between items-baseline mt-2">
              <span className="text-micro text-ink/65 font-medium">Per night rate</span>
              <span className="text-lg font-bold text-ink">₹6,999</span>
            </div>
          </div>

          {/* Card 3: Bus Card (Floating bottom left) */}
          <div className="absolute bottom-[10%] left-[10%] glass rounded-2xl p-4 shadow-lg w-60 border border-white/30 transform hover:-translate-y-1 hover:scale-102 transition-all duration-300 animate-float select-none" style={{ animationDelay: '2.4s' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-blue-600 flex items-center gap-1">🚌 Bus</span>
              <span className="text-micro bg-blue-600/10 text-blue-600 px-2 py-0.5 rounded-full font-mono uppercase font-bold">Express</span>
            </div>
            <h4 className="font-bold text-xs text-ink mb-1">Volvo Multi-Axle Sleeper</h4>
            <div className="flex justify-between items-baseline mt-2">
              <span className="text-micro text-ink/65 font-medium">Sleeper seat</span>
              <span className="text-lg font-bold text-ink">₹1,199</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Floating Search Widget */}
      <section id="search-widget" className="relative -mt-16 z-20 max-w-4xl mx-auto px-4 transition-transform duration-300 hover:scale-[1.005]">
        <div className="ticket-stub bg-gradient-to-br from-white/90 via-white/60 to-route/10 p-8 shadow-2xl border border-white/40 backdrop-blur-xl">
          {/* Header & Segmented Tab Selector */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 border-b border-ink/5 pb-6">
            <h2 className="text-xl md:text-2xl font-bold font-display text-ink select-none">
              Find Your Route System
            </h2>
            <div className="inline-flex p-1 bg-[#ECE6D5]/40 backdrop-blur-md rounded-full border border-white/40 gap-1 shadow-inner">
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key)}
                  className={`relative px-5 py-2 rounded-full text-body-sm font-semibold transition-all duration-300 flex items-center gap-2 cursor-pointer active:scale-95 focus:outline-none ${type === t.key
                    ? 'bg-white text-route shadow-sm font-bold'
                    : 'text-ink/70 hover:text-ink hover:bg-white/30'
                    }`}
                  aria-label={`Search category ${t.label}`}
                >
                  <span className="flex items-center justify-center">{t.icon}</span>
                  <span>{t.label}</span>
                  {type === t.key && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-route animate-fade-in"></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
            {activeType.key === 'hotel' ? (
              <div className="md:col-span-2">
                <div className="w-full relative">
                  <label className="text-label font-semibold text-ink/60 uppercase tracking-wide mb-2 block select-none">
                    Destination
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-ink/40">
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </span>
                    <input
                      required
                      placeholder="City (e.g., Goa)"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full glass pl-11 pr-4 py-3 h-12 rounded-2xl text-ink text-sm placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-route/30 focus:border-route/50 transition-all duration-300 border border-white"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="w-full relative">
                    <label className="text-label font-semibold text-ink/60 uppercase tracking-wide mb-2 block select-none">
                      From
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-ink/40">
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" />
                          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                        </svg>
                      </span>
                      <input
                        required
                        placeholder={activeType.key === 'flight' ? 'Origin (e.g., Bengaluru - BLR)' : 'Origin (e.g., Pune)'}
                        value={form.origin}
                        onChange={(e) => setForm({ ...form, origin: e.target.value })}
                        className="w-full glass pl-11 pr-4 py-3 h-12 rounded-2xl text-ink text-sm placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-route/30 focus:border-route/50 transition-all duration-300 border border-white"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="w-full relative">
                    <label className="text-label font-semibold text-ink/60 uppercase tracking-wide mb-2 block select-none">
                      To
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-ink/40">
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </span>
                      <input
                        required
                        placeholder={activeType.key === 'flight' ? 'Destination (e.g., New Delhi - DEL)' : 'Destination (e.g., Mumbai)'}
                        value={form.destination}
                        onChange={(e) => setForm({ ...form, destination: e.target.value })}
                        className="w-full glass pl-11 pr-4 py-3 h-12 rounded-2xl text-ink text-sm placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-route/30 focus:border-route/50 transition-all duration-300 border border-white"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <div className="w-full relative">
                <label className="text-label font-semibold text-ink/60 uppercase tracking-wide mb-2 block select-none">
                  Date
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-ink/40">
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full glass pl-11 pr-4 py-3 h-12 rounded-2xl text-ink text-sm placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-route/30 focus:border-route/50 transition-all duration-300 border border-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="btn-primary w-full py-3 h-12 flex items-center justify-center font-bold tracking-normal shadow-lg shadow-route/10 hover:shadow-route/20 active:scale-[0.98] transition-all"
              >
                Search {activeType.label}
                <svg className="w-4 h-4 ml-1.5 text-white/95" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l-.813-5.096L3 15l5.096-.813L9 9l.813 5.096L15 15l-5.096.813zM3 5.625L3.75 3l.75 2.625L7 4l-2.5.75L3.75 7l-.75-2.5L2 4l1-.375z" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* 3. Featured Destinations */}
      <section id="trending-routes">
        <div className="text-center mb-12">
          <Badge variant="primary" className="mb-2">Destinations</Badge>
          <h2 className="text-3xl font-bold font-display text-ink">Trending Routes</h2>
          <p className="text-ink/60 mt-1">Explore our most popular travel destinations</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {DESTINATIONS.slice(0, visibleCount).map((dest, idx) => (
            <div key={idx} className="group relative rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 h-64 cursor-pointer">
              <img src={dest.img} alt={dest.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent"></div>
              <div className="absolute bottom-5 left-5 text-white">
                <span className="text-micro bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full font-semibold uppercase">{dest.tag}</span>
                <h3 className="font-bold text-xl text-white mt-2 font-display">{dest.name}</h3>
                <p className="text-xs text-white/70 mt-0.5">{dest.country}</p>
              </div>
            </div>
          ))}
        </div>
        {visibleCount < DESTINATIONS.length && (
          <div className="flex justify-center mt-10">
            <Button
              onClick={() => setVisibleCount(DESTINATIONS.length)}
              variant="secondary"
              className="px-8 py-3 text-xs uppercase tracking-wider font-bold"
            >
              Load More
            </Button>
          </div>
        )}
      </section>

      {/* 4, 5, 6. Featured Stays, Flights, Buses (Mock Cards) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sample Flight */}
        <Card className="flex flex-col justify-between h-full hover:border-route/20 !p-5">
          <div>
            <Badge variant="primary" className="mb-3">Top Rated Flight</Badge>
            {/* Flat vector plane SVG in navy/ink brand color */}
            <svg className="w-10 h-10 text-ink mb-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5C20.5 3 18.5 3.5 17 5L13.5 8.5L5.3 6.7c-.9-.2-1.6.3-1.6 1.2l-.2 3.1l6.7 3.5l-3.5 3.5l-2.4-.6c-.5-.1-1.1.2-1.2.7l-.3.9l3.5 1.8l1.8 3.5l.9-.3c.5-.1.8-.7.7-1.2l-.6-2.4l3.5-3.5l3.5 6.7c.9 0 1.4-.7 1.2-1.6l-.2-3.1z" />
            </svg>
            <h3 className="text-xl font-bold font-display text-ink mb-1">SkyLine 202 · Bengaluru to Delhi</h3>
            <p className="text-xs text-ink/70 leading-relaxed mt-1.5">
              <span className="font-semibold text-ink/90">SkyLine Airlines</span> | Experience prompt, comfortable economy travel. Onboard services & high baggage limits.
            </p>
          </div>
          <div className="border-t border-ink/5 pt-4 mt-4 flex justify-between items-center">
            <div>
              <p className="text-2xl font-bold font-display text-route">₹4,500</p>
              <p className="text-micro text-ink/55">12 Seats Available</p>
            </div>
            <button
              onClick={() => navigate('/search?type=flight')}
              className="text-xs font-bold text-route hover:text-route-dark hover:underline transition-colors flex items-center gap-1 cursor-pointer focus:outline-none"
            >
              Explore & Book →
            </button>
          </div>
        </Card>

        {/* Sample Hotel */}
        <Card className="flex flex-col justify-between h-full hover:border-route/20 !p-5">
          <div>
            <Badge variant="primary" className="mb-3">Top Rated Stay</Badge>
            {/* Flat vector hotel/building SVG in signal/amber brand color */}
            <svg className="w-10 h-10 text-signal mb-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
              <line x1="9" y1="22" x2="9" y2="16" />
              <line x1="15" y1="22" x2="15" y2="16" />
              <line x1="9" y1="16" x2="15" y2="16" />
              <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M12 6h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
            </svg>
            <h3 className="text-xl font-bold font-display text-ink mb-1">Grand Heritage Palace</h3>
            <p className="text-xs text-ink/70 leading-relaxed mt-1.5">
              <span className="font-semibold text-ink/90">Location: New Delhi City Centre</span> | Luxury suite accommodation. Modern pool, premium dining experiences, and free concierge.
            </p>
          </div>
          <div className="border-t border-ink/5 pt-4 mt-4 flex justify-between items-center">
            <div>
              <p className="text-2xl font-bold font-display text-route">₹6,800</p>
              <p className="text-micro text-ink/55">Per Night • 4 Rooms Left</p>
            </div>
            <button
              onClick={() => navigate('/search?type=hotel')}
              className="text-xs font-bold text-route hover:text-route-dark hover:underline transition-colors flex items-center gap-1 cursor-pointer focus:outline-none"
            >
              Explore & Book →
            </button>
          </div>
        </Card>

        {/* Sample Bus */}
        <Card className="flex flex-col justify-between h-full hover:border-route/20 !p-5">
          <div>
            <Badge variant="primary" className="mb-3">Top Rated Coach</Badge>
            {/* Flat vector coach/bus SVG in ink brand color */}
            <svg className="w-10 h-10 text-ink/75 mb-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3C13 6.8 11.8 6 10.5 6H5c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-1" />
              <circle cx="7" cy="17" r="2" />
              <circle cx="17" cy="17" r="2" />
            </svg>
            <h3 className="text-xl font-bold font-display text-ink mb-1">Intercity Express · BLR to DEL</h3>
            <p className="text-xs text-ink/70 leading-relaxed mt-1.5">
              <span className="font-semibold text-ink/90">Operator: National Coach</span> | Premium sleeper air-conditioned coach with direct USB chargers and complimentary blankets.
            </p>
          </div>
          <div className="border-t border-ink/5 pt-4 mt-4 flex justify-between items-center">
            <div>
              <p className="text-2xl font-bold font-display text-route">₹2,800</p>
              <p className="text-micro text-ink/55">20 Seats Available</p>
            </div>
            <button
              onClick={() => navigate('/search?type=bus')}
              className="text-xs font-bold text-route hover:text-route-dark hover:underline transition-colors flex items-center gap-1 cursor-pointer focus:outline-none"
            >
              Explore & Book →
            </button>
          </div>
        </Card>
      </section>

      {/* 8. How It Works Section */}
      <section id="how-it-works" className="glass rounded-[2.5rem] p-10 md:p-16 border border-white">
        <div className="text-center mb-12">
          <Badge variant="primary" className="mb-2">Workflow</Badge>
          <h2 className="text-3xl font-bold font-display">How Waypoint Works</h2>
          <p className="text-ink/60 mt-1">Concurrence-safe holds in four simple steps</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {/* Step 1 */}
          <div className="text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-route/10 text-route flex items-center justify-center font-display font-bold mb-4 shadow-sm">1</div>
            <h3 className="font-bold text-lg mb-2">Search</h3>
            <p className="text-xs text-ink/70 leading-relaxed">Filter flights, stays, or buses side by side by selecting dates and locations.</p>
          </div>
          {/* Step 2 */}
          <div className="text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-route/10 text-route flex items-center justify-center font-display font-bold mb-4 shadow-sm">2</div>
            <h3 className="font-bold text-lg mb-2">Hold</h3>
            <p className="text-xs text-ink/70 leading-relaxed">Exclusively lock your seat or room choice under your profile for 10 minutes. Safe from double booking.</p>
          </div>
          {/* Step 3 */}
          <div className="text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-route/10 text-route flex items-center justify-center font-display font-bold mb-4 shadow-sm">3</div>
            <h3 className="font-bold text-lg mb-2">Pay</h3>
            <p className="text-xs text-ink/70 leading-relaxed">Complete checkout with mock gateway support protected by unique idempotency keys.</p>
          </div>
          {/* Step 4 */}
          <div className="text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-route/10 text-route flex items-center justify-center font-display font-bold mb-4 shadow-sm">4</div>
            <h3 className="font-bold text-lg mb-2">Travel</h3>
            <p className="text-xs text-ink/70 leading-relaxed">Access your active dashboard with print-friendly confirmations and easy cancellation releases.</p>
          </div>
        </div>
      </section>

      {/* 9. AI Travel Planner (UI Only) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <Badge variant="amber">EXPERIMENTAL</Badge>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-ink leading-tight">
            AI Travel Planner
          </h2>
          <p className="text-ink/70 text-sm leading-relaxed">
            Tell the planner your dream itinerary (e.g. "A quiet weekend flight from Bengaluru to Delhi with clean hotel recommendations") and let the planner scan active databases.
          </p>
          <form onSubmit={handleAiPlan} className="flex gap-2">
            <input
              placeholder="e.g. A budget flight to Delhi on July 15..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="glass px-4 py-3 rounded-2xl flex-1 focus:outline-none focus:ring-2 focus:ring-route/30 text-sm placeholder-ink/40 border border-white"
            />
            <Button type="submit" variant="primary">
              {planning ? 'Analyzing...' : 'Plan Trip'}
            </Button>
          </form>
        </div>

        {/* Suggestion Outputs */}
        <div className="bg-[#EAE4D4] rounded-[2rem] p-6 min-h-[220px] flex flex-col justify-center border border-ink/5">
          {aiSuggestions ? (
            <div className="space-y-4 animate-fade-up">
              <h3 className="text-label text-ink/60 mb-2">Recommended Itinerary</h3>
              {aiSuggestions.map((rec, idx) => (
                <div key={idx} className="glass p-4 rounded-xl flex justify-between items-center bg-white/40">
                  <div>
                    <span className="text-micro font-bold text-route">{rec.type}</span>
                    <h4 className="font-bold text-sm text-ink mt-0.5">{rec.title}</h4>
                    <p className="text-micro text-ink/50 mt-0.5">{rec.match}</p>
                  </div>
                  <span className="text-sm font-bold text-signal">{rec.price}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-ink/55">
              <span className="text-3xl mb-2 block">🤖</span>
              <p className="text-body-sm font-semibold">Enter your prompt to preview recommendations</p>
            </div>
          )}
        </div>
      </section>

      {/* 7. Why Choose Waypoint */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-8">
        {/* Zero Double Bookings */}
        <div className="flex flex-col justify-between h-full space-y-6">
          <div className="flex items-start gap-4">
            <span
              className="text-5xl select-none flex-shrink-0"
              role="img"
              aria-label="Shield"
              style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", "Helvetica Neue", Helvetica, Arial, sans-serif' }}
            >
              🛡️
            </span>
            <div>
              <h3 className="text-lg font-bold font-display text-ink mb-1.5">Zero Double Bookings</h3>
              <p className="text-xs text-ink/70 leading-relaxed">
                Our strict row-level PostgreSQL database locks ensure that once you hold a seat, it is 100% yours until your checkout expires.
              </p>
            </div>
          </div>

          {/* Schematic Diagram 1 */}
          <div className="w-full flex justify-center py-4 bg-white/20 rounded-2xl border border-white/40">
            <svg width="240" height="90" viewBox="0 0 240 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="select-none">
              {/* Server stack */}
              <rect x="10" y="10" width="55" height="18" rx="3" fill="#E4DFCF" stroke="#12172A" strokeWidth="1.5" />
              <rect x="16" y="16" width="6" height="6" rx="1" fill="#2F6F5E" />
              <rect x="10" y="34" width="55" height="18" rx="3" fill="#E4DFCF" stroke="#12172A" strokeWidth="1.5" />
              <rect x="16" y="40" width="6" height="6" rx="1" fill="#2F6F5E" />
              <rect x="10" y="58" width="55" height="18" rx="3" fill="#E4DFCF" stroke="#12172A" strokeWidth="1.5" />
              <rect x="16" y="64" width="6" height="6" rx="1" fill="#2F6F5E" />

              {/* Connecting line */}
              <path d="M 75 43 L 115 43" stroke="#12172A" strokeWidth="1.5" strokeDasharray="3 3" />
              <path d="M 110 39.5 L 115 43 L 110 46.5" fill="#12172A" />

              {/* Locked seat badge */}
              <rect x="125" y="20" width="105" height="46" rx="8" fill="#2F6F5E" fillOpacity="0.08" stroke="#2F6F5E" strokeWidth="1.5" />

              {/* Seat Held label */}
              <rect x="140" y="10" width="75" height="14" rx="4" fill="#2F6F5E" />
              <text x="177.5" y="20" fill="#FFFFFF" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">SEAT HELD</text>

              {/* Lock icon */}
              <rect x="167" y="38" width="20" height="14" rx="2" fill="#12172A" />
              <path d="M 172 38 V 33 A 5 5 0 0 1 182 33 V 38" fill="none" stroke="#12172A" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Idempotent Payments */}
        <div className="flex flex-col justify-between h-full space-y-6">
          <div className="flex items-start gap-4">
            <span
              className="text-5xl select-none flex-shrink-0"
              role="img"
              aria-label="Credit Card"
              style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", "Helvetica Neue", Helvetica, Arial, sans-serif' }}
            >
              💳
            </span>
            <div>
              <h3 className="text-lg font-bold font-display text-ink mb-1.5">Idempotent Payments</h3>
              <p className="text-xs text-ink/70 leading-relaxed">
                Unique cryptographic idempotency keys protect every charge request. We make duplicate credit card transactions historically impossible.
              </p>
            </div>
          </div>

          {/* Schematic Diagram 2 */}
          <div className="w-full flex justify-center py-4 bg-white/20 rounded-2xl border border-white/40">
            <svg width="240" height="90" viewBox="0 0 240 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="select-none">
              {/* Incoming Request 1 */}
              <rect x="10" y="12" width="75" height="26" rx="4" fill="#FFFFFF" stroke="#2F6F5E" strokeWidth="1.5" />
              <text x="47.5" y="27" fill="#2F6F5E" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Request #1</text>
              <path d="M 90 25 L 115 25" stroke="#2F6F5E" strokeWidth="1.5" strokeDasharray="3 3" />
              <path d="M 110 21.5 L 115 25 L 110 28.5" fill="#2F6F5E" />

              {/* Gateway / Tunnel */}
              <rect x="125" y="10" width="36" height="66" rx="4" fill="#E4DFCF" stroke="#12172A" strokeWidth="1.5" />
              <rect x="131" y="20" width="24" height="56" rx="2" fill="#12172A" />
              <text x="143" y="6" fill="#12172A" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">GATEWAY</text>

              {/* Incoming Request 2 (Duplicate -> Cached/Blocked) */}
              <rect x="10" y="52" width="75" height="26" rx="4" fill="#FFFFFF" stroke="#D98E04" strokeWidth="1.5" />
              <text x="47.5" y="67" fill="#D98E04" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Request #1 (Retry)</text>
              <path d="M 90 65 L 115 65" stroke="#D98E04" strokeWidth="1.5" />

              {/* Blocked circle */}
              <circle cx="115" cy="65" r="5" fill="#D98E04" />
              <line x1="112" y1="65" x2="118" y2="65" stroke="#FFFFFF" strokeWidth="1.5" />

              {/* Cached result badge */}
              <rect x="170" y="32" width="60" height="22" rx="4" fill="#D98E04" />
              <text x="200" y="45" fill="#FFFFFF" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">CACHED RESULT</text>
            </svg>
          </div>
        </div>

        {/* 10-Min Decision Buffer */}
        <div className="flex flex-col justify-between h-full space-y-6">
          <div className="flex items-start gap-4">
            <span
              className="text-5xl select-none flex-shrink-0"
              role="img"
              aria-label="Stopwatch"
              style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", "Helvetica Neue", Helvetica, Arial, sans-serif' }}
            >
              ⏱️
            </span>
            <div>
              <h3 className="text-lg font-bold font-display text-ink mb-1.5">10-Min Decision Buffer</h3>
              <p className="text-xs text-ink/70 leading-relaxed">
                Need to double check your calendar or consult a co-traveler? Lock your prices and options and take 10 minutes to verify.
              </p>
            </div>
          </div>

          {/* Schematic Diagram 3 */}
          <div className="w-full flex justify-center py-4 bg-white/20 rounded-2xl border border-white/40">
            <svg width="240" height="90" viewBox="0 0 240 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="select-none">
              {/* Mini Calendar */}
              <rect x="10" y="10" width="80" height="70" rx="5" fill="#FFFFFF" stroke="#12172A" strokeWidth="1.5" />
              <path d="M 10 18 A 5 5 0 0 1 15 13 H 85 A 5 5 0 0 1 90 18 V 26 H 10 Z" fill="#D98E04" />
              <text x="50" y="22" fill="#FFFFFF" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">JULY</text>
              <line x1="30" y1="26" x2="30" y2="80" stroke="#E4DFCF" strokeWidth="1" />
              <line x1="50" y1="26" x2="50" y2="80" stroke="#E4DFCF" strokeWidth="1" />
              <line x1="70" y1="26" x2="70" y2="80" stroke="#E4DFCF" strokeWidth="1" />
              <line x1="10" y1="44" x2="90" y2="44" stroke="#E4DFCF" strokeWidth="1" />
              <line x1="10" y1="62" x2="90" y2="62" stroke="#E4DFCF" strokeWidth="1" />
              {/* Day selection */}
              <rect x="51" y="45" width="18" height="16" fill="#2F6F5E" fillOpacity="0.2" />
              <circle cx="60" cy="53" r="5" fill="#2F6F5E" />
              <text x="60" y="56" fill="#FFFFFF" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">15</text>

              {/* Countdown badge */}
              <rect x="105" y="15" width="125" height="26" rx="6" fill="#E4DFCF" stroke="#12172A" strokeWidth="1.5" />
              <text x="115" y="31" fill="#12172A" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">HOLD TIME:</text>
              <text x="188" y="32" fill="#D98E04" fontSize="9" fontWeight="bold" fontFamily="sans-serif">09:59 MIN</text>

              {/* Continue booking button mockup */}
              <rect x="105" y="50" width="125" height="24" rx="6" fill="#2F6F5E" stroke="#2F6F5E" strokeWidth="1" />
              <text x="167.5" y="65" fill="#FFFFFF" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Continue Booking →</text>
            </svg>
          </div>
        </div>
      </section>

      {/* 11. Testimonials */}
      <section className="relative py-12 px-6 overflow-hidden rounded-[2.5rem]">
        {/* Subtle connected nodes SVG background */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0 opacity-10">
          <svg className="absolute -top-10 -left-10 w-64 h-64 text-ink" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="40" cy="80" r="3" fill="currentColor" />
            <circle cx="120" cy="40" r="3.5" fill="currentColor" />
            <circle cx="160" cy="120" r="3" fill="currentColor" />
            <circle cx="80" cy="180" r="4" fill="currentColor" />
            <circle cx="200" cy="160" r="2.5" fill="currentColor" />
            <line x1="40" y1="80" x2="120" y2="40" stroke="currentColor" />
            <line x1="120" y1="40" x2="160" y2="120" stroke="currentColor" />
            <line x1="40" y1="80" x2="80" y2="180" stroke="currentColor" />
            <line x1="80" y1="180" x2="160" y2="120" stroke="currentColor" />
            <line x1="160" y1="120" x2="200" y2="160" stroke="currentColor" />
            <line x1="80" y1="180" x2="200" y2="160" stroke="currentColor" />
          </svg>
          <svg className="absolute -bottom-10 -right-10 w-64 h-64 text-ink" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="200" cy="80" r="3" fill="currentColor" />
            <circle cx="120" cy="120" r="3.5" fill="currentColor" />
            <circle cx="80" cy="40" r="3" fill="currentColor" />
            <circle cx="160" cy="180" r="4" fill="currentColor" />
            <circle cx="40" cy="100" r="2.5" fill="currentColor" />
            <line x1="200" y1="80" x2="120" y2="120" stroke="currentColor" />
            <line x1="120" y1="120" x2="80" y2="40" stroke="currentColor" />
            <line x1="200" y1="80" x2="160" y2="180" stroke="currentColor" />
            <line x1="160" y1="180" x2="120" y2="120" stroke="currentColor" />
            <line x1="120" y1="120" x2="40" y2="100" stroke="currentColor" />
            <line x1="160" y1="180" x2="40" y2="100" stroke="currentColor" />
          </svg>
        </div>

        <div className="relative z-10 text-center mb-12 select-none">
          <Badge variant="primary" className="mb-2">Reviews</Badge>
          <h2 className="text-3xl font-bold font-display text-ink">What Our Travelers Say</h2>
          <p className="text-ink/60 mt-1">Real reviews from our multi-modal booking platform</p>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
          {/* Left panel: Bullet Highlights */}
          <div className="glass rounded-[2rem] p-8 flex flex-col justify-center gap-6 border border-white/40 bg-white/30 backdrop-blur-xl">
            <h3 className="text-xl font-bold font-display text-ink leading-tight select-none">
              Seamless Travel<br />Starts Here.
            </h3>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-route/10 flex items-center justify-center text-route flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5C20.5 3 18.5 3.5 17 5L13.5 8.5L5.3 6.7c-.9-.2-1.6.3-1.6 1.2l-.2 3.1l6.7 3.5l-3.5 3.5l-2.4-.6c-.5-.1-1.1.2-1.2.7l-.3.9l3.5 1.8l1.8 3.5l.9-.3c.5-.1.8-.7.7-1.2l-.6-2.4l3.5-3.5l3.5 6.7c.9 0 1.4-.7 1.2-1.6l-.2-3.1z" />
                  </svg>
                </span>
                <span className="text-xs font-semibold text-ink/80 select-none">Simultaneous Flight & Hotel Hold</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-route/10 flex items-center justify-center text-route flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </span>
                <span className="text-xs font-semibold text-ink/80 select-none">10-Minute Hold For Approval</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-route/10 flex items-center justify-center text-route flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M18 8A3 3 0 1018 2A3 3 0 0018 8zM6 15A3 3 0 106 9A3 3 0 006 15zM18 22A3 3 0 1018 16A3 3 0 0018 22zM8.5 13.5l7 4M15.5 8.5l-7 4" />
                  </svg>
                </span>
                <span className="text-xs font-semibold text-ink/80 select-none">Seamless App Collaboration</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-route/10 flex items-center justify-center text-route flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6" />
                    <path d="M5 12h14" />
                  </svg>
                </span>
                <span className="text-xs font-semibold text-ink/80 select-none">Efficient Multi-Modal Flow</span>
              </li>
            </ul>
          </div>

          {/* Testimonial Card 1: Sarah Jenkins */}
          <Card className="flex flex-col justify-between h-full p-8 bg-white/30 backdrop-blur-xl border border-white/40">
            <div>
              {/* Header row with Avatar + Held badges */}
              <div className="flex items-center justify-between gap-4 mb-6">
                <span className="text-4xl flex-shrink-0 bg-white/40 w-14 h-14 rounded-xl flex items-center justify-center shadow-sm select-none">
                  {REVIEWS[0].avatar}
                </span>
                <div className="flex flex-col gap-1.5 bg-[#ECE6D5]/40 p-2 rounded-xl border border-white/50 flex-shrink-0 select-none">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-ink/80">Flight</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[8px] font-extrabold px-1 rounded">HELD</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-ink/80">Hotel</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[8px] font-extrabold px-1 rounded">HELD</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-ink/70 italic leading-relaxed">
                "{REVIEWS[0].text}"
              </p>
            </div>
            <div className="mt-6 border-t border-ink/5 pt-4">
              <h4 className="font-bold text-sm text-ink font-display">{REVIEWS[0].name}</h4>
              <p className="text-[10px] text-route font-bold uppercase tracking-wide mt-0.5">{REVIEWS[0].role}</p>
            </div>
          </Card>

          {/* Testimonial Card 2: Rahul Mehta */}
          <Card className="flex flex-col justify-between h-full p-8 bg-white/30 backdrop-blur-xl border border-white/40">
            <div>
              {/* Header row with Avatar + Mini route diagram */}
              <div className="flex items-center justify-between gap-4 mb-6">
                <span className="text-4xl flex-shrink-0 bg-white/40 w-14 h-14 rounded-xl flex items-center justify-center shadow-sm select-none">
                  {REVIEWS[1].avatar}
                </span>
                <div className="flex items-center gap-2 bg-[#ECE6D5]/40 p-2.5 rounded-xl border border-white/50 flex-shrink-0 select-none">
                  <span className="text-[10px] font-bold text-ink">BLR</span>
                  <div className="flex flex-col items-center">
                    <span className="text-[7px] text-route font-bold mb-0.5">3min</span>
                    <svg className="w-8 h-2 text-route" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" viewBox="0 0 32 10">
                      <path d="M 0 5 L 32 5" />
                      <path d="M 28 2 L 32 5 L 28 8" fill="none" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-ink">DEL</span>
                </div>
              </div>
              <p className="text-xs text-ink/70 italic leading-relaxed">
                "{REVIEWS[1].text}"
              </p>
            </div>
            <div className="mt-6 border-t border-ink/5 pt-4">
              <h4 className="font-bold text-sm text-ink font-display">{REVIEWS[1].name}</h4>
              <p className="text-[10px] text-route font-bold uppercase tracking-wide mt-0.5">{REVIEWS[1].role}</p>
            </div>
          </Card>
        </div>
      </section>

      {/* 12. Newsletter Section */}
      <section className="relative max-w-4xl mx-auto py-12">
        {/* Ambient background glows (above body bg, below glass card) */}
        <div className="absolute top-[10%] left-[15%] w-64 h-64 bg-route/30 blur-[60px] rounded-full pointer-events-none z-0 animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-[10%] right-[15%] w-64 h-64 bg-signal/20 blur-[60px] rounded-full pointer-events-none z-0 animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }}></div>

        {/* Frosted Glass Card Container */}
        <div className="relative z-10 rounded-[2.5rem] p-10 md:p-16 border border-white/70 text-center overflow-hidden bg-white/30 backdrop-blur-3xl shadow-[0_24px_75px_rgba(18,23,42,0.08),_inset_0_1px_2px_rgba(255,255,255,0.8)]">
          <div className="absolute inset-0 opacity-10 bg-grid-pattern pointer-events-none z-0"></div>

          {/* Subtle decorative sparkle in the bottom-right corner */}
          <div className="absolute bottom-6 right-6 text-route/30 pointer-events-none select-none z-10">
            <svg className="w-6 h-6 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3c.132 5.096.813 5.777 5.904 5.909-5.096.132-5.777.813-5.909 5.904-.132-5.096-.813-5.777-5.904-5.909 5.096-.132 5.777-.813 5.909-5.904z" />
            </svg>
          </div>

          <div className="relative z-10 max-w-xl mx-auto space-y-6">
            {/* Glassy 3D-styled envelope icon container with reflections */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-white/70 backdrop-blur-md flex items-center justify-center shadow-[0_8px_32px_rgba(18,23,42,0.06),_inset_0_1px_2px_rgba(255,255,255,0.9)] border border-white/80 text-3xl select-none animate-float">
              ✉️
            </div>

            <h2 className="text-3xl font-bold font-display text-ink">Subscribe for Route Releases</h2>

            <p className="text-sm text-ink/70 leading-relaxed">
              Stay updated with new airline connections, high-speed rail integration, and seat holding tips. Zero spam, cancel anytime.
            </p>

            <form className="flex flex-col md:flex-row gap-3 justify-center max-w-md mx-auto items-stretch" onSubmit={(e) => { e.preventDefault(); alert('Thank you for subscribing!'); }}>
              <div className="relative flex-1 flex items-center">
                <input
                  type="email"
                  placeholder="Your email address"
                  required
                  className="w-full bg-white/50 backdrop-blur-sm pl-5 pr-11 py-3 h-12 rounded-2xl text-ink placeholder-ink/40 border border-white/60 focus:outline-none focus:ring-2 focus:ring-route/30 focus:bg-white/85 transition-all duration-300 text-sm shadow-[inset_0_1px_2px_rgba(18,23,42,0.02)]"
                />
                <span className="absolute right-4 text-ink/40 select-none pointer-events-none">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </span>
              </div>
              <Button type="submit" variant="primary" className="px-6 h-12 flex-shrink-0 shadow-md">
                Subscribe
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
