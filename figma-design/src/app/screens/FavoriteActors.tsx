import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Plus, Heart, Film, X } from 'lucide-react';

type Actor = {
  id: string;
  name: string;
  photo: string;
  moviesCount: number;
};

export function FavoriteActors() {
  const navigate = useNavigate();
  const [favoriteActors, setFavoriteActors] = useState<Actor[]>([
    {
      id: '1',
      name: 'Prabhas',
      photo: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=300',
      moviesCount: 8,
    },
    {
      id: '2',
      name: 'Allu Arjun',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
      moviesCount: 6,
    },
    {
      id: '3',
      name: 'Jr NTR',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300',
      moviesCount: 5,
    },
    {
      id: '4',
      name: 'Mahesh Babu',
      photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300',
      moviesCount: 7,
    },
    {
      id: '5',
      name: 'Ram Charan',
      photo: 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=300',
      moviesCount: 4,
    },
    {
      id: '6',
      name: 'Nani',
      photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300',
      moviesCount: 9,
    },
  ]);

  const removeActor = (id: string) => {
    setFavoriteActors(favoriteActors.filter((actor) => actor.id !== id));
  };

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-black to-black/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/profile')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Favorite Actors</h1>
                <p className="text-sm text-white/60">{favoriteActors.length} actors</p>
              </div>
            </div>
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 transition-colors">
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        {favoriteActors.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {favoriteActors.map((actor) => (
              <div
                key={actor.id}
                className="relative bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all group"
              >
                <button
                  onClick={() => removeActor(actor.id)}
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4 text-white" />
                </button>

                <div className="aspect-[3/4] relative">
                  <img src={actor.photo} alt={actor.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-bold text-white mb-1">{actor.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-white/70">
                      <Film className="w-3 h-3" />
                      <span>{actor.moviesCount} movies</span>
                    </div>
                  </div>

                  <div className="absolute top-3 left-3">
                    <div className="w-8 h-8 rounded-full bg-red-600/90 backdrop-blur-sm flex items-center justify-center">
                      <Heart className="w-4 h-4 text-white fill-white" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-white/20" />
            </div>
            <p className="text-white/60 text-lg font-medium mb-1">No favorite actors</p>
            <p className="text-sm text-white/40 mb-6">Add your favorite Telugu actors</p>
            <button className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors">
              Add Actors
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
