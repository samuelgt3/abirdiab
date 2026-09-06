import { LanguageProvider, useLanguage } from './context/LanguageContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CoursesProvider } from './context/CoursesContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { TestimonialsProvider } from './context/TestimonialsContext.jsx';
import { AdminProvider } from './context/AdminContext.jsx';
import { OverlayProvider } from './context/OverlayContext.jsx';

import GrainOverlay from './components/GrainOverlay.jsx';
import Toast from './components/Toast.jsx';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import Marquee from './components/Marquee.jsx';
import About from './components/About.jsx';
import SectionDivider from './components/SectionDivider.jsx';
import Services from './components/Services.jsx';
import Sessions from './components/Sessions.jsx';
import Meditations from './components/Meditations.jsx';
import Watch from './components/Watch.jsx';
import CoursesSection from './components/Courses/CoursesSection.jsx';
import CoursesPortal from './components/Courses/CoursesPortal.jsx';
import CourseDetailModal from './components/Courses/CourseDetailModal.jsx';
import JournalSection from './components/Journal/JournalSection.jsx';
import JournalReader from './components/Journal/JournalReader.jsx';
import Testimonials from './components/Testimonials.jsx';
import FAQ from './components/FAQ.jsx';
import Newsletter from './components/Newsletter.jsx';
import Contact from './components/Contact.jsx';
import Footer from './components/Footer.jsx';
import FloatingActionButton from './components/FloatingActionButton.jsx';
import BookingModal from './components/modals/BookingModal.jsx';
import CheckoutModal from './components/modals/CheckoutModal.jsx';
import AuthModal from './components/modals/AuthModal.jsx';
import AccountModal from './components/modals/AccountModal.jsx';

const SEC = { about: '01', services: '02', sessions: '03', meditations: '04', watch: '05', courses: '06', journal: '07', testimonials: '08', faq: '09' };

function Page() {
  const { dirAttr, langAttr, bodyFont } = useLanguage();

  return (
    <div dir={dirAttr} lang={langAttr} style={{ background: '#FDFBF6', color: '#16211D', fontFamily: bodyFont, position: 'relative' }}>
      <GrainOverlay />
      <Toast />
      <Header />

      <main id="top" style={{ background: '#FDFBF6' }}>
        <Hero />
        <Marquee />
        <About secNum={SEC.about} />
        <SectionDivider />
        <Services secNum={SEC.services} />
        <Sessions secNum={SEC.sessions} />
        <Meditations secNum={SEC.meditations} />
        <Watch secNum={SEC.watch} />
        <CoursesSection secNum={SEC.courses} />
        <JournalSection secNum={SEC.journal} />
        <Testimonials secNum={SEC.testimonials} />
        <FAQ secNum={SEC.faq} />
        <Newsletter />
        <Contact />
      </main>

      <Footer />

      <CoursesPortal />
      <CourseDetailModal />
      <JournalReader />
      <FloatingActionButton />
      <BookingModal />
      <CheckoutModal />
      <AuthModal />
      <AccountModal />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>
          <CoursesProvider>
            <CartProvider>
              <TestimonialsProvider>
                <AdminProvider>
                  <OverlayProvider>
                    <Page />
                  </OverlayProvider>
                </AdminProvider>
              </TestimonialsProvider>
            </CartProvider>
          </CoursesProvider>
        </AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}
