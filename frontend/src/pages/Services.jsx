import React from 'react';
import Card from '../components/Card.jsx';
import Badge from '../components/Badge.jsx';

export default function Services() {
  const primaryServices = [
    {
      title: 'Flights',
      icon: '✈️',
      description: 'Book seats on popular routes. Select specific seats in real-time, view detailed schedules (including arrival and departure local timezones), and lock in pricing before purchase.',
      features: ['Real-time seat maps', 'Local timezone adjustments', 'Major carrier integrations'],
    },
    {
      title: 'Stays / Hotels',
      icon: '🏨',
      description: 'Book rooms at properties worldwide. Reserve specific dates, view catalog ratings and location details, and hold inventory secure from double-booking.',
      features: ['Frosted image galleries', 'Zero-charge seat holds', 'Detailed room profiles'],
    },
    {
      title: 'Buses',
      icon: '🚌',
      description: 'Secure intercity coach tickets side by side with your flights. Pick seats, check routes, and combine them with other travel legs in one trip dashboard.',
      features: ['Seat selection layout', 'Express route schedules', 'Operator verified reviews'],
    },
  ];

  const features = [
    {
      title: 'Secure Booking',
      desc: 'All booking payments are processed with unique, server-validated idempotency keys to ensure duplicate charges are impossible.',
      icon: '🔒',
    },
    {
      title: 'Seat Hold (10 min Buffer)',
      desc: 'Lock in specific seat numbers and base prices. Your choice is held exclusively for 10 minutes while you decide or complete checkout.',
      icon: '⏱️',
    },
    {
      title: 'Easy Cancellation',
      desc: 'Cancel reservations directly from your dashboard. A single click releases the held seat back into availability instantly.',
      icon: '🔄',
    },
    {
      title: 'Refund Policy',
      desc: 'Payments captured for confirmed bookings are fully refundable based on operator rules, reverting seamlessly to your payment card.',
      icon: '💳',
    },
    {
      title: 'Fast Checkout',
      desc: 'Save your profile to sign in and check out in seconds. Enter cards safely using standard mock gateway routing.',
      icon: '⚡',
    },
    {
      title: 'Customer Support',
      desc: 'Our support team is available 24/7. Submit issues online or resolve booking questions directly through active tickets.',
      icon: '💬',
    },
  ];

  return (
    <div className="pb-24 max-w-5xl mx-auto animate-fade-up">
      {/* Header */}
      <section className="text-center mb-16">
        <Badge variant="primary" className="mb-4">Our Services</Badge>
        <h1 className="text-4xl md:text-5xl font-bold font-display leading-tight max-w-2xl mx-auto">
          One platform. All your bookings.
        </h1>
        <p className="mt-6 text-ink/75 max-w-2xl mx-auto text-lg leading-relaxed">
          Waypoint aggregates top-tier transit and lodging options. We bring flight routing, hotel stays, and intercity coach lines into a single booking flow.
        </p>
      </section>

      {/* Primary Services Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        {primaryServices.map((service, idx) => (
          <Card key={idx} className="flex flex-col justify-between h-full hover:border-route/40">
            <div>
              <span className="text-4xl mb-6 block">{service.icon}</span>
              <h2 className="text-2xl font-bold font-display mb-3">{service.title}</h2>
              <p className="text-ink/70 text-sm leading-relaxed mb-6">{service.description}</p>
            </div>
            <ul className="space-y-2.5 border-t border-ink/5 pt-5">
              {service.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-xs font-semibold text-route">
                  <svg className="w-4 h-4 text-route" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </section>

      {/* Additional Features Grid */}
      <section className="mb-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold font-display">Engineered for Reliability</h2>
          <p className="text-ink/60 mt-2">Core features built into our concurrency-safe booking engine</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => (
            <Card key={idx} className="flex gap-4 p-5 hover:border-ink/10">
              <span className="text-2xl flex-shrink-0 mt-0.5">{feat.icon}</span>
              <div>
                <h3 className="font-semibold text-ink text-sm mb-1">{feat.title}</h3>
                <p className="text-ink/70 text-xs leading-relaxed">{feat.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
