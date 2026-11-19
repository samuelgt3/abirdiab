import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { CheckoutProvider } from './components/checkout/CheckoutContext.jsx';
import { AuthProvider } from './hooks/AuthContext.jsx';
import { CartProvider } from './hooks/CartContext.jsx';
import { SiteProvider } from './hooks/SiteContext.jsx';
import PageMeta from './components/PageMeta.jsx';
import Home from './pages/Home.jsx';
import NotFound from './pages/NotFound.jsx';

// Everything except the home page is loaded only when visited, so the first page loads faster.
const AccountPage = lazy(() => import('./pages/AccountPage.jsx'));
const BookingPage = lazy(() => import('./pages/BookingPage.jsx'));
const GiftPage = lazy(() => import('./pages/GiftPage.jsx'));
const CoursePage = lazy(() => import('./pages/CoursePage.jsx'));
const JournalPage = lazy(() => import('./pages/JournalPage.jsx'));
const JournalPostPage = lazy(() => import('./pages/JournalPostPage.jsx'));
const MaterialsPage = lazy(() => import('./pages/MaterialsPage.jsx'));
const PaymentReturnPage = lazy(() => import('./pages/PaymentReturnPage.jsx'));
const PolicyPage = lazy(() => import('./pages/PolicyPage.jsx'));
const TestimonialsPage = lazy(() => import('./pages/TestimonialsPage.jsx'));

// The admin is code-split so visitors never download it.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

export default function App() {
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<p className="p-8 text-sm">Loading…</p>}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route
        path="/*"
        element={
          <SiteProvider>
            <AuthProvider>
            <CheckoutProvider>
            <CartProvider>
            <Suspense fallback={<p className="p-8 text-center text-sm text-ink/75" role="status">…</p>}>
            <Routes>
              <Route path="/" element={<><PageMeta k="home" /><Home /></>} />
              <Route path="/materials" element={<><PageMeta k="materials" /><MaterialsPage /></>} />
              <Route path="/materials/:slug" element={<CoursePage />} />
              <Route path="/journal" element={<><PageMeta k="journal" /><JournalPage /></>} />
              <Route path="/journal/:slug" element={<JournalPostPage />} />
              <Route path="/testimonials" element={<><PageMeta k="testimonials" /><TestimonialsPage /></>} />
              <Route path="/payment/return" element={<><PageMeta k="payment" /><PaymentReturnPage /></>} />
              <Route path="/account" element={<><PageMeta k="account" /><AccountPage /></>} />
              <Route path="/booking/:ref" element={<><PageMeta k="booking" /><BookingPage /></>} />
              <Route path="/gift/:token" element={<><PageMeta k="gift" /><GiftPage /></>} />
              <Route path="/privacy" element={<><PageMeta k="privacy" /><PolicyPage kind="privacy" /></>} />
              <Route path="/terms" element={<><PageMeta k="terms" /><PolicyPage kind="terms" /></>} />
              <Route path="/refunds" element={<><PageMeta k="refunds" /><PolicyPage kind="refund" /></>} />
              <Route path="*" element={<><PageMeta k="notfound" /><NotFound /></>} />
            </Routes>
            </Suspense>
            </CartProvider>
            </CheckoutProvider>
            </AuthProvider>
          </SiteProvider>
        }
      />
    </Routes>
  );
}
