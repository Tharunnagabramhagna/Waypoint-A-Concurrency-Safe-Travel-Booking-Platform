import { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import SearchResults from './pages/SearchResults.jsx';
import ListingDetail from './pages/ListingDetail.jsx';
import Checkout from './pages/Checkout.jsx';
import MyBookings from './pages/MyBookings.jsx';
import TrackingPage from './pages/TrackingPage.jsx';
import ExplorePage from './pages/ExplorePage.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import About from './pages/About.jsx';
import Services from './pages/Services.jsx';
import Contact from './pages/Contact.jsx';

import ProtectedRoute from './components/ProtectedRoute.jsx';
import SplashScreen from './components/splash/SplashScreen.jsx';

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export default function App() {
  const location = useLocation();
  const isAuthPage = AUTH_PATHS.includes(location.pathname);
  const [showSplash, setShowSplash] = useState(true);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Startup Splash Animation */}
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      {!isAuthPage && <Navbar />}

      {isAuthPage ? (
        /* Auth pages render full-bleed — no constrained container */
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      ) : (
        <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/listings/:id" element={<ListingDetail />} />
            <Route path="/checkout/:bookingId" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
            <Route path="/tracking/:bookingId" element={<ProtectedRoute><TrackingPage /></ProtectedRoute>} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </main>
      )}

      {!isAuthPage && <Footer />}
    </div>
  );
}

