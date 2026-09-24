'use client';

import { useEffect, useState } from 'react';

const languageKey = 'maydon-language';

export default function useLanguage() {
  const [uz, setUz] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(languageKey) === 'ru') setUz(false);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = uz ? 'uz' : 'ru';
  }, [uz]);

  function toggleLanguage() {
    const next = !uz;
    setUz(next);
    try {
      localStorage.setItem(languageKey, next ? 'uz' : 'ru');
    } catch {}
  }

  return { uz, toggleLanguage };
}
