import { useState } from 'react';
import { Sparkles, Play, Film, Music, Video, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router';

interface SurpriseContent {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  category: 'song' | 'short-film' | 'bts' | 'interview' | 'trailer';
  duration: string;
  views: string;
}

const surpriseContent: SurpriseContent[] = [
  {
    id: '1',
    title: 'Private Lyrical Song - Pushpa 2',
    description: 'Exclusive unreleased lyrical video from Pushpa 2',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'song',
    duration: '3:45',
    views: '2.3M',
  },
  {
    id: '2',
    title: 'Award Winning Telugu Short Film',
    description: 'Critically acclaimed short film about family bonds',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'short-film',
    duration: '18:32',
    views: '890K',
  },
  {
    id: '3',
    title: 'Behind The Scenes - RRR VFX Breakdown',
    description: 'Exclusive VFX breakdown of iconic RRR sequences',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'bts',
    duration: '12:15',
    views: '5.1M',
  },
  {
    id: '4',
    title: 'Prabhas Exclusive Interview',
    description: 'Rare candid conversation with Prabhas about his journey',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'interview',
    duration: '25:40',
    views: '3.7M',
  },
  {
    id: '5',
    title: 'Unreleased Song - Salaar',
    description: 'Deleted song from Salaar never released in theaters',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'song',
    duration: '4:22',
    views: '1.8M',
  },
  {
    id: '6',
    title: 'Telugu Indie Short Film - "Silence"',
    description: 'Award-winning psychological thriller short',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'short-film',
    duration: '22:10',
    views: '654K',
  },
  {
    id: '7',
    title: 'Mahesh Babu Making of Guntur Kaaram',
    description: 'Exclusive making footage from the sets',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'bts',
    duration: '8:45',
    views: '2.9M',
  },
  {
    id: '8',
    title: 'Hidden Gem - Classic Telugu Song',
    description: 'Rare 90s song remastered in 4K',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'song',
    duration: '5:15',
    views: '412K',
  },
];

export function Surprise() {
  const [selectedVideo, setSelectedVideo] = useState<SurpriseContent | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const navigate = useNavigate();

  const filteredContent =
    filter === 'all' ? surpriseContent : surpriseContent.filter((c) => c.category === filter);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'song':
        return <Music className="w-4 h-4" />;
      case 'short-film':
        return <Film className="w-4 h-4" />;
      case 'bts':
        return <Video className="w-4 h-4" />;
      case 'interview':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Play className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'song':
        return 'bg-purple-600';
      case 'short-film':
        return 'bg-blue-600';
      case 'bts':
        return 'bg-green-600';
      case 'interview':
        return 'bg-orange-600';
      default:
        return 'bg-red-600';
    }
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-md mx-auto px-4 pt-4 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Surprise Content</h1>
              <p className="text-sm text-white/60">Exclusive & Hidden Gems</p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'all'
                  ? 'bg-red-600 text-white'
                  : 'bg-white/10 text-white/60 active:bg-white/20'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('song')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'song'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/60 active:bg-white/20'
              }`}
            >
              Songs
            </button>
            <button
              onClick={() => setFilter('short-film')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'short-film'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-white/60 active:bg-white/20'
              }`}
            >
              Short Films
            </button>
            <button
              onClick={() => setFilter('bts')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'bts'
                  ? 'bg-green-600 text-white'
                  : 'bg-white/10 text-white/60 active:bg-white/20'
              }`}
            >
              BTS
            </button>
            <button
              onClick={() => setFilter('interview')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'interview'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white/10 text-white/60 active:bg-white/20'
              }`}
            >
              Interviews
            </button>
          </div>
        </div>
      </div>

      {/* Video Player */}
      {selectedVideo && (
        <div className="max-w-md mx-auto px-4 mt-6">
          <div className="bg-white/5 rounded-xl overflow-hidden">
            <div className="relative aspect-video bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
                title={selectedVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`px-2 py-1 ${getCategoryColor(selectedVideo.category)} text-white text-xs font-bold rounded flex items-center gap-1`}
                >
                  {getCategoryIcon(selectedVideo.category)}
                  {selectedVideo.category.replace('-', ' ').toUpperCase()}
                </span>
                <span className="text-xs text-white/60">{selectedVideo.duration}</span>
                <span className="text-xs text-white/60">• {selectedVideo.views} views</span>
              </div>
              <h3 className="font-semibold text-white mb-1">{selectedVideo.title}</h3>
              <p className="text-sm text-white/60">{selectedVideo.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="max-w-md mx-auto px-4 mt-6">
        <div className="grid grid-cols-2 gap-3">
          {filteredContent.map((content) => (
            <button
              key={content.id}
              onClick={() => setSelectedVideo(content)}
              className="bg-white/5 rounded-xl overflow-hidden active:bg-white/10 transition-colors text-left"
            >
              <div className="relative aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-red-600/80 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
                  </div>
                </div>
                <div className="absolute top-2 left-2">
                  <span
                    className={`px-2 py-1 ${getCategoryColor(content.category)} text-white text-xs font-bold rounded flex items-center gap-1`}
                  >
                    {getCategoryIcon(content.category)}
                  </span>
                </div>
                <div className="absolute bottom-2 right-2">
                  <span className="px-2 py-0.5 bg-black/80 text-white text-xs font-bold rounded">
                    {content.duration}
                  </span>
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-medium text-white text-sm line-clamp-2 mb-1">
                  {content.title}
                </h3>
                <p className="text-xs text-white/60">{content.views} views</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Fun Fact */}
      <div className="max-w-md mx-auto px-4 mt-8">
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white mb-1">Did you know?</h3>
              <p className="text-sm text-white/80">
                This section features rare content you won't find on regular streaming platforms -
                from unreleased songs to exclusive behind-the-scenes footage!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
