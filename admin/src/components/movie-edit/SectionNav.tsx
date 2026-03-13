'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Play, Film, Tv, Building2, Users, Calendar } from 'lucide-react';

export const MOVIE_SECTIONS = [
  { id: 'basic-info', label: 'Basic Info', icon: FileText },
  { id: 'videos', label: 'Videos', icon: Play },
  { id: 'posters', label: 'Posters', icon: Film },
  { id: 'platforms', label: 'Platforms', icon: Tv },
  { id: 'production-houses', label: 'Production', icon: Building2 },
  { id: 'cast-crew', label: 'Cast & Crew', icon: Users },
  { id: 'theatrical-runs', label: 'Theatrical Runs', icon: Calendar },
] as const;

// @contract tracks which section is in the viewport; scrollTo programmatically scrolls and locks highlight
export function useActiveSection(sectionIds: readonly string[]): {
  activeId: string;
  scrollTo: (id: string) => void;
} {
  const [activeId, setActiveId] = useState(sectionIds[0]);
  const lockRef = useRef(false);
  const scrollingRef = useRef(false);
  const scrollListenerCleanupRef = useRef<(() => void) | null>(null);

  // Clean up scroll listener on unmount
  useEffect(() => {
    return () => {
      scrollListenerCleanupRef.current?.();
    };
  }, []);

  // @sideeffect scrolls window, attaches temporary scroll listener, sets lock to prevent observer conflicts
  const scrollTo = useCallback((id: string) => {
    // Clean up any previous scroll listener
    scrollListenerCleanupRef.current?.();
    setActiveId(id);
    // @invariant lockRef prevents IntersectionObserver from overriding the programmatic highlight
    lockRef.current = true;
    scrollingRef.current = true;
    let timer: ReturnType<typeof setTimeout>;
    function onSettled() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        scrollingRef.current = false;
        window.removeEventListener('scroll', onSettled);
        scrollListenerCleanupRef.current = null;
      }, 150);
    }
    window.addEventListener('scroll', onSettled);
    scrollListenerCleanupRef.current = () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onSettled);
    };
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    // @assumes sticky header is 120px tall; if SectionNav height changes, update this
    const STICKY_HEIGHT = 120;

    function update() {
      if (lockRef.current) return;
      // Last section visible on screen wins.
      // First section: only when near the nav bar (at the top of the page).
      let candidate: string | null = null;
      for (let i = 0; i < sectionIds.length; i++) {
        const el = document.getElementById(sectionIds[i]);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.bottom <= STICKY_HEIGHT) continue; // scrolled past
        if (i === 0) {
          if (rect.top <= STICKY_HEIGHT) candidate = sectionIds[i];
        } else {
          if (rect.top < window.innerHeight) candidate = sectionIds[i];
        }
      }
      if (candidate) setActiveId(candidate);
    }

    let ticking = false;
    // @edge distinguishes programmatic scrolls (lockRef stays) from manual scrolls (lockRef released)
    function onScroll() {
      if (lockRef.current) {
        if (scrollingRef.current) return; // programmatic scroll in progress
        lockRef.current = false; // manual scroll detected, release lock
      }
      if (!ticking) {
        requestAnimationFrame(() => {
          update();
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, [sectionIds]);

  return { activeId, scrollTo };
}

interface SectionNavProps {
  activeSection: string;
  onScrollTo: (id: string) => void;
}

export function SectionNav({ activeSection, onScrollTo }: SectionNavProps) {
  // @sync sticky top-[52px] must sit just below the Header (h-16 minus border)
  return (
    <div className="sticky top-[52px] z-20 backdrop-blur bg-surface/95 border-b border-outline -mx-4 px-4 py-2">
      <div className="flex gap-1.5 overflow-x-auto">
        {MOVIE_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => onScrollTo(section.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-red-600 text-white'
                  : 'bg-surface-elevated text-on-surface-muted hover:bg-input hover:text-on-surface-muted'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {section.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
