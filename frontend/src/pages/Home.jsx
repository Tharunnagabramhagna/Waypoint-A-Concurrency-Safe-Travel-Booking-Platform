import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card.jsx';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';

const TYPES = [
  { key: 'flight', label: 'Flights', icon: '✈️' },
  { key: 'hotel', label: 'Hotels', icon: '🏨' },
  { key: 'bus', label: 'Buses', icon: '🚌' },
];

const DESTINATIONS = [
  { name: 'Bengaluru', country: 'India', img: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=400&q=80', tag: 'Tech Hub' },
  { name: 'Delhi', country: 'India', img: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=400&q=80', tag: 'Historical' },
  { name: 'Paris', country: 'France', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80', tag: 'Romantic' },
  { name: 'Tokyo', country: 'Japan', img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80', tag: 'Futuristic' },
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
        className="relative rounded-[2.5rem] overflow-hidden min-h-[620px] grid grid-cols-1 lg:grid-cols-2 items-center gap-8 px-8 md:px-16 shadow-2xl bg-cover bg-center border border-white/10" 
        style={{ backgroundImage: "url('/images/hero_travel_bg.png')" }}
      >
        {/* Soft Gradient Overlay & Contrast Control */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink/30 via-transparent to-ink/20"></div>
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-ink/40 pointer-events-none"></div>

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
        <div className="hidden lg:flex flex-col relative w-full h-[480px] justify-center items-center">
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
        <div className="glass rounded-[2rem] p-8 shadow-2xl border border-white/40 bg-white/50 backdrop-blur-xl">
          {/* Segmented Tab Selector */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1 bg-white/30 backdrop-blur-md rounded-2xl border border-white/20 gap-1.5 shadow-inner">
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key)}
                  className={`px-5 py-2.5 rounded-xl text-body-sm font-semibold transition-all duration-300 flex items-center gap-2 cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-route/30 ${
                    type === t.key
                      ? 'bg-route text-white shadow-md'
                      : 'text-ink/75 hover:text-ink hover:bg-white/40'
                  }`}
                  aria-label={`Search category ${t.label}`}
                >
                  <span className="text-base select-none">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
            {activeType.key === 'hotel' ? (
              <div className="md:col-span-2">
                <Input
                  label="Destination"
                  placeholder="City (e.g., Delhi)"
                  required
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
            ) : (
              <>
                <div>
                  <Input
                    label="From"
                    placeholder="Origin (e.g., BLR)"
                    required
                    value={form.origin}
                    onChange={(e) => setForm({ ...form, origin: e.target.value })}
                  />
                </div>
                <div>
                  <Input
                    label="To"
                    placeholder="Destination (e.g., DEL)"
                    required
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  />
                </div>
              </>
            )}

            <div>
              <Input
                label="Date"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="btn-primary w-full py-3.5 h-12 flex items-center justify-center font-bold tracking-normal shadow-lg shadow-route/10 hover:shadow-route/20 active:scale-[0.98] transition-all"
              >
                Search {activeType.label}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {DESTINATIONS.map((dest, idx) => (
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
      </section>

      {/* 4, 5, 6. Featured Stays, Flights, Buses (Mock Cards) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sample Flight */}
        <Card className="flex flex-col justify-between h-full hover:border-route/20">
          <div>
            <Badge variant="primary" className="mb-4">Top Rated Flight</Badge>
            <span className="text-4xl block mb-4">✈️</span>
            <h3 className="text-xl font-bold font-display text-ink mb-1">SkyLine 202 · Bangalore to Delhi</h3>
            <p className="text-xs text-ink/50">Operator: SkyLine Airlines</p>
            <p className="text-ink/70 text-sm mt-3 leading-relaxed">
              Experience prompt, comfortable economy travel with onboard services and high baggage limits.
            </p>
          </div>
          <div className="border-t border-ink/5 pt-5 mt-6 flex justify-between items-center">
            <div>
              <p className="text-2xl font-bold font-display text-route">₹4,500.00</p>
              <p className="text-micro text-ink/55">12 Seats Available</p>
            </div>
            <Button onClick={() => navigate('/search?type=flight')} variant="secondary" className="py-2 px-4 text-xs font-semibold">
              Search
            </Button>
          </div>
        </Card>

        {/* Sample Hotel */}
        <Card className="flex flex-col justify-between h-full hover:border-route/20">
          <div>
            <Badge variant="primary" className="mb-4">Top Rated Stay</Badge>
            <span className="text-4xl block mb-4">🏨</span>
            <h3 className="text-xl font-bold font-display text-ink mb-1">Grand Heritage Palace</h3>
            <p className="text-xs text-ink/50">Location: New Delhi City Centre</p>
            <p className="text-ink/70 text-sm mt-3 leading-relaxed">
              Luxury suite accommodation with modern pool, premium dining experiences, and free concierge.
            </p>
          </div>
          <div className="border-t border-ink/5 pt-5 mt-6 flex justify-between items-center">
            <div>
              <p className="text-2xl font-bold font-display text-route">₹6,800.00</p>
              <p className="text-micro text-ink/55">Per Night • 4 Rooms Left</p>
            </div>
            <Button onClick={() => navigate('/search?type=hotel')} variant="secondary" className="py-2 px-4 text-xs font-semibold">
              Search
            </Button>
          </div>
        </Card>

        {/* Sample Bus */}
        <Card className="flex flex-col justify-between h-full hover:border-route/20">
          <div>
            <Badge variant="primary" className="mb-4">Top Rated Coach</Badge>
            <span className="text-4xl block mb-4">🚌</span>
            <h3 className="text-xl font-bold font-display text-ink mb-1">Intercity Express · BLR to DEL</h3>
            <p className="text-xs text-ink/50">Operator: National Coach</p>
            <p className="text-ink/70 text-sm mt-3 leading-relaxed">
              Premium sleeper air-conditioned coach with direct USB chargers and complimentary blankets.
            </p>
          </div>
          <div className="border-t border-ink/5 pt-5 mt-6 flex justify-between items-center">
            <div>
              <p className="text-2xl font-bold font-display text-route">₹2,800.00</p>
              <p className="text-micro text-ink/55">20 Seats Available</p>
            </div>
            <Button onClick={() => navigate('/search?type=bus')} variant="secondary" className="py-2 px-4 text-xs font-semibold">
              Search
            </Button>
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
            Tell the planner your dream itinerary (e.g. "A quiet weekend flight from Bangalore to Delhi with clean hotel recommendations") and let the planner scan active databases.
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
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="p-8">
          <span className="text-3xl block mb-4">🛡️</span>
          <h3 className="text-lg font-bold font-display mb-2">Zero Double Bookings</h3>
          <p className="text-xs text-ink/70 leading-relaxed">
            Our strict row-level PostgreSQL database locks ensure that once you hold a seat, it is 100% yours until your checkout expires.
          </p>
        </Card>
        <Card className="p-8">
          <span className="text-3xl block mb-4">💳</span>
          <h3 className="text-lg font-bold font-display mb-2">Idempotent Payments</h3>
          <p className="text-xs text-ink/70 leading-relaxed">
            Unique cryptographic idempotency keys protect every charge request. We make duplicate credit card transactions historically impossible.
          </p>
        </Card>
        <Card className="p-8">
          <span className="text-3xl block mb-4">⏱️</span>
          <h3 className="text-lg font-bold font-display mb-2">10-Min Decision Buffer</h3>
          <p className="text-xs text-ink/70 leading-relaxed">
            Need to double check your calendar or consult a co-traveler? Lock your prices and options and take 10 minutes to verify.
          </p>
        </Card>
      </section>

      {/* 11. Testimonials */}
      <section>
        <div className="text-center mb-12">
          <Badge variant="primary" className="mb-2">Reviews</Badge>
          <h2 className="text-3xl font-bold font-display text-ink">What Our Travelers Say</h2>
          <p className="text-ink/60 mt-1">Real reviews from our multi-modal booking platform</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {REVIEWS.map((rev, idx) => (
            <Card key={idx} className="flex gap-4 p-6 items-start">
              <span className="text-4xl flex-shrink-0 bg-white/40 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm">{rev.avatar}</span>
              <div>
                <p className="text-xs text-ink/70 italic leading-relaxed">"{rev.text}"</p>
                <h4 className="font-bold text-sm text-ink mt-3 font-display">{rev.name}</h4>
                <p className="text-label text-route mt-0.5 uppercase font-semibold">{rev.role}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 12. Newsletter Section */}
      <section className="glass rounded-[2.5rem] p-10 md:p-16 border border-white text-center max-w-4xl mx-auto relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-grid-pattern pointer-events-none"></div>
        <div className="relative z-10 max-w-xl mx-auto space-y-6">
          <span className="text-4xl block animate-float">✉️</span>
          <h2 className="text-3xl font-bold font-display text-ink">Subscribe for Route Releases</h2>
          <p className="text-sm text-ink/70 leading-relaxed">
            Stay updated with new airline connections, high-speed rail integration, and seat holding tips. Zero spam, cancel anytime.
          </p>
          <form className="flex flex-col md:flex-row gap-3 justify-center max-w-md mx-auto" onSubmit={(e) => { e.preventDefault(); alert('Thank you for subscribing!'); }}>
            <input
              type="email"
              placeholder="Your email address"
              required
              className="glass px-4 py-3 rounded-2xl flex-1 focus:outline-none focus:ring-2 focus:ring-route/30 text-sm placeholder-ink/40 border border-white"
            />
            <Button type="submit" variant="primary" className="px-6 py-3">
              Subscribe
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
