import { Outlet, useLocation, useNavigate } from 'react-router';
import { Home, Compass, Calendar, Bookmark, Sparkles, User } from 'lucide-react';

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const isMovieDetail = location.pathname.startsWith('/movie/');
  const isSearch = location.pathname === '/search';
  const isProfileSubpage =
    location.pathname.startsWith('/profile/') && location.pathname !== '/profile';

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/watchlist', icon: Bookmark, label: 'Watchlist' },
    { path: '/surprise', icon: Sparkles, label: 'Surprise' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Main Content */}
      <div
        className={`h-full overflow-y-auto ${!isMovieDetail && !isSearch && !isProfileSubpage ? 'pb-20' : ''}`}
      >
        <Outlet />
      </div>

      {/* Bottom Navigation - Hidden on movie detail, search, and profile subpages */}
      {!isMovieDetail && !isSearch && !isProfileSubpage && (
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-lg border-t border-white/5 z-50">
          <div className="max-w-md mx-auto px-4">
            <div className="flex items-center justify-around h-20">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div
                      className={`p-2 rounded-xl transition-all ${
                        isActive
                          ? 'bg-red-600 text-white'
                          : 'text-white/60 group-hover:text-white group-hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span
                      className={`text-xs transition-colors ${
                        isActive ? 'text-white font-medium' : 'text-white/60 group-hover:text-white'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
