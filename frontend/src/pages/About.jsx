import React from 'react';
import Card from '../components/Card.jsx';
import Badge from '../components/Badge.jsx';

export default function About() {
  const stats = [
    { value: '99.99%', label: 'Hold Guarantee', desc: 'Concurrence-safe seat holding' },
    { value: '1.2M+', label: 'Trips Booked', desc: 'Flights, hotels & intercity buses' },
    { value: '10 Min', label: 'Hold Timeout', desc: 'Secure booking buffer' },
    { value: '100%', label: 'Idempotency', desc: 'Zero double charges' },
  ];

  const benefits = [
    { title: 'Zero App Juggling', text: 'Plan and purchase your multi-leg transit and lodging in one single workflow.' },
    { title: 'Optimistic Locking', text: 'Our row-level locking ensures that a held seat cannot be booked by anyone else.' },
    { title: 'No Hidden Fees', text: 'All base fares are shown upfront, including full price breakdowns before checking out.' },
  ];

  return (
    <div className="pb-24 max-w-5xl mx-auto animate-fade-up">
      {/* Hero Header */}
      <section className="text-center mb-16">
        <Badge variant="primary" className="mb-4">About Waypoint</Badge>
        <h1 className="text-4xl md:text-5xl font-bold font-display leading-tight max-w-2xl mx-auto">
          One route. Three ways to get there.
        </h1>
        <p className="mt-6 text-ink/75 max-w-2xl mx-auto text-lg leading-relaxed">
          Waypoint was founded to solve a frustrating travel problem: booking flights, hotels, and buses usually requires juggling multiple tabs, currencies, and accounts. We unify your travel pipeline.
        </p>
      </section>

      {/* Mission & Vision Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <Card className="flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-route/10 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-route" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold font-display mb-4">Our Mission</h2>
            <p className="text-ink/80 leading-relaxed">
              To make multi-modal trip planning feel like a single cohesive booking. We replace chaotic travel management with a calm, streamlined transaction flow that respects your time and money.
            </p>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-signal/10 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-signal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold font-display mb-4">Our Vision</h2>
            <p className="text-ink/80 leading-relaxed">
              We envision a world where booking transit is friction-free. By establishing standard API endpoints for airlines, hotels, and coach lines, we give travelers absolute booking certainty.
            </p>
          </div>
        </Card>
      </section>

      {/* Travel Statistics */}
      <section className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold font-display">Waypoint in Numbers</h2>
          <p className="text-ink/60 mt-2">Real-time stats across our global booking engine</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, idx) => (
            <Card key={idx} className="text-center py-8">
              <p className="text-4xl font-bold font-display text-route mb-2">{s.value}</p>
              <p className="text-sm font-semibold text-ink/80">{s.label}</p>
              <p className="text-micro text-ink/50 mt-1">{s.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Technology & Security */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <Card>
          <Badge variant="primary" className="mb-4">System Architecture</Badge>
          <h3 className="text-2xl font-bold font-display mb-3">Robust Technology</h3>
          <p className="text-ink/75 leading-relaxed mb-4 text-sm">
            Our backend utilizes Node.js and a highly-optimized PostgreSQL transactional layer. By employing explicit row-level locking (`SELECT ... FOR UPDATE`), we ensure a seat, room, or ticket cannot be booked concurrently by different users.
          </p>
          <p className="text-ink/75 leading-relaxed text-sm">
            Background queue processing (powered by Redis and BullMQ) safely releases abandoned holds after exactly 10 minutes, making inventory instantly available back to search indexes.
          </p>
        </Card>

        <Card>
          <Badge variant="amber" className="mb-4">Transactional Safety</Badge>
          <h3 className="text-2xl font-bold font-display mb-3">Enterprise Security</h3>
          <p className="text-ink/75 leading-relaxed mb-4 text-sm">
            All checkouts are protected with unique, server-validated idempotency keys. This guarantees that double clicking a submit button or experiencing network drops will never result in duplicate charges or multiple reservations.
          </p>
          <p className="text-ink/75 leading-relaxed text-sm">
            Communication channels are fully encrypted, and JWT validation manages authentication tokens safely with rolling cookie sessions and CSRF-token double cookie submissions.
          </p>
        </Card>
      </section>

      {/* Booking Process & Benefits */}
      <section className="glass rounded-[2rem] p-8 md:p-12 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Badge variant="secondary" className="mb-3">Booking Certainty</Badge>
            <h3 className="text-3xl font-bold font-display mb-4">The Platform Benefits</h3>
            <p className="text-ink/70 text-sm leading-relaxed">
              We focus on delivering booking certainty above all else. Here is why traveling with Waypoint makes a difference.
            </p>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((b, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-route/15 text-route flex items-center justify-center font-display font-bold text-xs">
                  {idx + 1}
                </div>
                <div>
                  <h4 className="font-semibold text-ink mb-1">{b.title}</h4>
                  <p className="text-ink/70 text-xs leading-relaxed">{b.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
