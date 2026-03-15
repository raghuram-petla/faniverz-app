'use client';
import { FileText, Play, Film, Users, Calendar } from 'lucide-react';

// @contract 5 tabs — Platforms & Production absorbed into Basic Info; poster/backdrop uploads moved to Posters
export const MOVIE_SECTIONS = [
  { id: 'basic-info', label: 'Basic Info', icon: FileText },
  { id: 'posters', label: 'Posters', icon: Film },
  { id: 'videos', label: 'Videos', icon: Play },
  { id: 'cast-crew', label: 'Cast & Crew', icon: Users },
  { id: 'releases', label: 'Releases', icon: Calendar },
] as const;

export type MovieSectionId = (typeof MOVIE_SECTIONS)[number]['id'];

export interface SectionNavProps {
  activeSection: string;
  onSectionChange: (id: MovieSectionId) => void;
}

// @contract controlled tab bar — parent owns activeSection state; no scroll/IntersectionObserver logic
export function SectionNav({ activeSection, onSectionChange }: SectionNavProps) {
  return (
    <div className="sticky top-[52px] z-20 backdrop-blur bg-surface/95 border-b border-outline -mx-4 px-4 py-2">
      <div className="flex gap-1.5 overflow-x-auto">
        {MOVIE_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
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
