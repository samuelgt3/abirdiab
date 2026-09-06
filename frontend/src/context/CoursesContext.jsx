import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as coursesApi from '../api/courses.js';

const CoursesContext = createContext(null);

const BLANK_NEW_COURSE = {
  category: 'E-Course',
  type: 'Video',
  title: 'New course',
  desc: 'Add a description.',
  full: 'Add a fuller description here.',
  image: 'images/pendulum-set.jpg',
  price: 29,
  free: false,
  downloadable: false,
  meta: 'New',
  badge: 'Lesson 1 free',
  locked: true,
  whatYouGet: ['Add what this includes'],
};

export function CoursesProvider({ children }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    coursesApi.getCourses().then((list) => {
      setCourses(list);
      setLoading(false);
    });
  }, []);

  const persist = useCallback((list) => {
    setCourses(list);
    coursesApi.saveCourses(list);
  }, []);

  const addCourse = useCallback(() => {
    setCourses((prev) => {
      const list = prev.concat([{ ...BLANK_NEW_COURSE, id: Date.now() }]);
      coursesApi.saveCourses(list);
      return list;
    });
  }, []);

  const removeCourse = useCallback((id) => {
    setCourses((prev) => {
      const list = prev.filter((c) => c.id !== id);
      coursesApi.saveCourses(list);
      return list;
    });
  }, []);

  const toggleLock = useCallback((id) => {
    setCourses((prev) => {
      const list = prev.map((c) => (c.id === id ? { ...c, locked: !c.locked } : c));
      coursesApi.saveCourses(list);
      return list;
    });
  }, []);

  return (
    <CoursesContext.Provider value={{ courses, loading, addCourse, removeCourse, toggleLock, persist }}>
      {children}
    </CoursesContext.Provider>
  );
}

export function useCourses() {
  const ctx = useContext(CoursesContext);
  if (!ctx) throw new Error('useCourses must be used within a CoursesProvider');
  return ctx;
}
