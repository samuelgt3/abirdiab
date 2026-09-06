import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLanguage } from './LanguageContext.jsx';
import * as testimonialsApi from '../api/testimonials.js';
import { GRADIENTS } from '../data/gradients.js';

const TestimonialsContext = createContext(null);

export function TestimonialsProvider({ children }) {
  const { lang } = useLanguage();
  const [testimonials, setTestimonials] = useState([]);
  const [isCustom, setIsCustom] = useState(false);
  const isCustomRef = useRef(false);

  useEffect(() => {
    isCustomRef.current = isCustom;
  }, [isCustom]);

  useEffect(() => {
    // Once the client has customized testimonials, switching languages no
    // longer overwrites them with sample content (matches the original).
    if (isCustomRef.current) return;
    testimonialsApi.getTestimonials(lang).then(({ list, isCustom: custom }) => {
      setTestimonials(list);
      setIsCustom(custom);
    });
  }, [lang]);

  const persist = useCallback((list) => {
    setTestimonials(list);
    setIsCustom(true);
    testimonialsApi.saveTestimonials(list);
  }, []);

  const updateField = useCallback((id, field, value) => {
    setTestimonials((prev) => {
      const list = prev.map((t) => (t.id === id ? { ...t, [field]: value } : t));
      setIsCustom(true);
      testimonialsApi.saveTestimonials(list);
      return list;
    });
  }, []);

  const removeTestimonial = useCallback((id) => {
    setTestimonials((prev) => {
      const list = prev.filter((t) => t.id !== id);
      setIsCustom(true);
      testimonialsApi.saveTestimonials(list);
      return list;
    });
  }, []);

  const addTestimonial = useCallback(() => {
    setTestimonials((prev) => {
      const list = prev.concat([{
        name: 'New client',
        role: '1:1 Sessions',
        quote: 'Add their quote here.',
        gradient: GRADIENTS[prev.length % GRADIENTS.length],
        id: Date.now(),
      }]);
      setIsCustom(true);
      testimonialsApi.saveTestimonials(list);
      return list;
    });
  }, []);

  return (
    <TestimonialsContext.Provider
      value={{ testimonials, updateField, removeTestimonial, addTestimonial, persist }}
    >
      {children}
    </TestimonialsContext.Provider>
  );
}

export function useTestimonials() {
  const ctx = useContext(TestimonialsContext);
  if (!ctx) throw new Error('useTestimonials must be used within a TestimonialsProvider');
  return ctx;
}
