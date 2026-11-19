import { Link } from 'react-router-dom';
import { useSite } from '../hooks/SiteContext.jsx';
import CourseCard from './CourseCard.jsx';

const HOME_COUNT = 8; // two rows of four on the home page

/** Home-page preview of the materials (a still grid, no scrolling); the full catalogue lives at /materials. */
export default function Courses() {
  const { t, content } = useSite();
  const c = t.courses;
  const list = (content?.courses || []).slice(0, HOME_COUNT);

  return (
    <section id="courses" className="section-pad scroll-mt-16">
      <div className="container-x">
        <div className="mb-10 flex items-baseline gap-4 border-b border-green/15 pb-3.5">
          <span className="kicker">{c.kicker}</span>
        </div>
        <h2 className="mb-6 font-serif text-[2rem] font-normal text-ink md:text-[2.3rem]">{c.title}</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          {list.map((x) => <CourseCard key={x.id ?? x.title} course={x} />)}
        </div>
        <div className="mt-9 flex justify-center">
          <Link to="/materials" className="btn-outline !py-3 no-underline">{c.viewAll}</Link>
        </div>
      </div>
    </section>
  );
}
