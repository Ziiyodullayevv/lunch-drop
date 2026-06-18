import { useState, useEffect } from 'react';
import { isActiveLink } from 'minimal-shared/utils';

const HOME_SECTION_IDS = ['imkoniyatlar', 'jarayon', 'savollar'] as const;

function getHashId(path: string) {
  const hashIndex = path.indexOf('#');

  return hashIndex === -1 ? null : path.slice(hashIndex + 1);
}

function getActiveHomeSection() {
  let activeSection: string | null = null;
  const threshold = window.innerHeight * 0.35;

  HOME_SECTION_IDS.forEach((id) => {
    const element = document.getElementById(id);

    if (element && element.getBoundingClientRect().top <= threshold) {
      activeSection = id;
    }
  });

  return activeSection;
}

export function useMainNavActive(pathname: string, path: string, deepMatch: boolean) {
  const sectionId = getHashId(path);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    if (pathname !== '/') {
      setActiveSection(null);
      return undefined;
    }

    let frameId = 0;

    const updateActiveSection = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        setActiveSection(getActiveHomeSection());
      });
    };

    updateActiveSection();

    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);
    window.addEventListener('hashchange', updateActiveSection);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
      window.removeEventListener('hashchange', updateActiveSection);
    };
  }, [pathname]);

  if (pathname === '/') {
    return sectionId ? activeSection === sectionId : activeSection === null;
  }

  return isActiveLink(pathname, path, deepMatch);
}
