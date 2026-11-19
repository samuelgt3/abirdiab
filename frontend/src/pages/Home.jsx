import About from '../components/About.jsx';
import Contact from '../components/Contact.jsx';
import Courses from '../components/Courses.jsx';
import Faq from '../components/Faq.jsx';
import Hero from '../components/Hero.jsx';
import Journal from '../components/Journal.jsx';
import Layout from '../components/Layout.jsx';
import Meditations, { Watch } from '../components/Meditations.jsx';
import Newsletter from '../components/Newsletter.jsx';
import Services from '../components/Services.jsx';
import Sessions from '../components/Sessions.jsx';
import Testimonials from '../components/Testimonials.jsx';
import Workshops from '../components/Workshops.jsx';

/** One long page in the design's order; Materials, Journal and Testimonials each also have a full page. */
export default function Home() {
  return (
    <Layout>
      <Hero />
      <About />
      <Services />
      <Sessions />
      <Meditations />
      <Workshops />
      <Courses />
      <Watch />
      <Journal />
      <Testimonials />
      <Faq />
      <Newsletter />
      <Contact />
    </Layout>
  );
}
