import React, { useState } from 'react';
import Card from '../components/Card.jsx';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    // Simulate contact form submission
    setSubmitted(true);
    setForm({ name: '', email: '', message: '' });
    setTimeout(() => setSubmitted(false), 5000);
  }

  const contactCards = [
    { title: 'Email Us', val: 'support@waypoint.com', desc: 'Direct support line', icon: '✉️' },
    { title: 'Call Us', val: '+1 (800) 555-WAYP', desc: 'Mon-Fri 9:00 - 18:00 EST', icon: '📞' },
    { title: 'Our Office', val: 'One Infinite Loop, Cupertino, CA', desc: 'Headquarters', icon: '📍' },
    { title: 'Working Hours', val: '24/7 Server Operations', desc: 'Support answers within 2 hours', icon: '🕒' },
  ];

  const faqs = [
    {
      q: 'What happens if my payment fails?',
      a: 'If a payment fails (e.g. invalid card numbers or declined transactions), the booking is held in a "pending_payment" state. Your seat or room reservation remains locked for the duration of the 10-minute hold window, allowing you to try another card.',
    },
    {
      q: 'How long is my seat held before I pay?',
      a: 'Seats, hotel rooms, and coach fares are locked exclusively under your profile for exactly 10 minutes (600 seconds). If checkout is not completed within this TTL window, background processes release the inventory and expire the hold.',
    },
    {
      q: 'Can I cancel after booking?',
      a: 'Yes. You can cancel any active booking from the "My Bookings" page. Cancelled reservations instantly release the associated seats or rooms back into the booking pool.',
    },
  ];

  return (
    <div className="pb-24 max-w-5xl mx-auto animate-fade-up">
      {/* Header */}
      <section className="text-center mb-16">
        <Badge variant="primary" className="mb-4">Contact & Support</Badge>
        <h1 className="text-4xl md:text-5xl font-bold font-display leading-tight max-w-2xl mx-auto">
          We are here to help.
        </h1>
        <p className="mt-6 text-ink/75 max-w-2xl mx-auto text-lg leading-relaxed">
          Have questions about your seat holds, payments, or cancellations? Reach out through our support channel or explore our FAQs.
        </p>
      </section>

      {/* Grid of Contact Form + Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        {/* Form Column */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="glass rounded-[2rem] p-8 flex flex-col gap-5 border border-white">
            <h2 className="text-2xl font-bold font-display mb-2">Send a Message</h2>
            
            {submitted && (
              <div className="bg-route/10 border border-route text-route text-sm p-4 rounded-xl font-semibold">
                ✓ Message received! Our support team will respond to your email shortly.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                placeholder="John Doe"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="john@example.com"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="text-label font-semibold text-ink/60 uppercase tracking-wide mb-2 block">
                Message / Question
              </label>
              <textarea
                rows="5"
                placeholder="Write your query details here..."
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full glass px-4 py-3 rounded-2xl text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-route/30 focus:border-route/50 transition-all duration-300"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary">
                Send Message
              </Button>
            </div>
          </form>
        </div>

        {/* Contact Info Column */}
        <div className="flex flex-col gap-4">
          {contactCards.map((card, idx) => (
            <Card key={idx} className="flex items-start gap-4 p-5 hover:border-route/30" hoverEffect={true}>
              <span className="text-2xl flex-shrink-0 mt-0.5">{card.icon}</span>
              <div>
                <h3 className="font-semibold text-ink text-sm mb-0.5">{card.title}</h3>
                <p className="text-route text-body-sm font-semibold break-all">{card.val}</p>
                <p className="text-ink/50 text-micro mt-1">{card.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Google Maps Placeholder */}
      <section className="mb-20">
        <Card className="p-0 overflow-hidden relative h-[300px] border border-white flex items-center justify-center bg-[#ECE6D5]" hoverEffect={false}>
          {/* Abstract styled map drawing inside canvas/background */}
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-gradient-to-tr from-route to-route-dark bg-grid-pattern"></div>
          
          <div className="relative text-center p-6 glass rounded-2xl max-w-sm mx-auto shadow-lg">
            <span className="text-3xl mb-2 block">🗺️</span>
            <h3 className="font-semibold text-ink">Waypoint headquarters</h3>
            <p className="text-body-sm text-ink/75 mt-1">Cupertino, CA, USA</p>
            <span className="mt-3 text-micro uppercase font-bold text-route border border-route/20 px-2 py-0.5 rounded-full inline-block bg-white/40">
              Interactive Map Disabled
            </span>
          </div>
        </Card>
      </section>

      {/* FAQ Block */}
      <section>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold font-display">Frequently Asked Questions</h2>
          <p className="text-ink/60 mt-2">Answers to common booking and hold queries</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {faqs.map((faq, idx) => (
            <Card key={idx} className="flex flex-col p-6 hover:border-ink/10" hoverEffect={false}>
              <h3 className="font-display font-bold text-lg text-ink mb-3">{faq.q}</h3>
              <p className="text-ink/70 text-xs leading-relaxed mt-auto border-t border-ink/5 pt-4">
                {faq.a}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
