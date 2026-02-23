import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  User,
  Settings,
  Bell,
  Heart,
  Star,
  Film,
  LogOut,
  ChevronRight,
  Edit,
  MessageSquare,
  LogIn,
} from 'lucide-react';
import { reviews as allReviews } from '../data/movies';

export function Profile() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Track login state
  const [user] = useState({
    name: 'Guest User',
    email: 'guest@example.com',
    photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
    memberSince: 'Browsing as Guest',
  });

  // Mock user stats
  const watchlistCount = 4;
  const reviewsCount = allReviews.length;
  const avgRating = 4.3;

  const menuItems = [
    { icon: User, label: 'Edit Profile', action: () => navigate('/profile/edit') },
    {
      icon: Bell,
      label: 'Notifications',
      action: () => navigate('/profile/notifications'),
      badge: '3',
    },
    { icon: MessageSquare, label: 'My Reviews', action: () => navigate('/profile/reviews') },
    { icon: Settings, label: 'Settings', action: () => navigate('/profile/settings') },
    { icon: Heart, label: 'Favorite Actors', action: () => navigate('/profile/favorite-actors') },
    { icon: Film, label: 'Watched Movies', action: () => navigate('/profile/watched') },
  ];

  return (
    <div className="min-h-screen bg-black pb-8">
      <div className="max-w-md mx-auto px-4 pt-6">
        {/* Profile Card */}
        <div className="bg-zinc-900 rounded-2xl p-6 mb-6 border border-white/10">
          <div className="flex items-start gap-4 mb-4">
            {/* Profile Photo */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-zinc-900">
                <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
              </div>
              <button className="absolute bottom-0 right-0 w-7 h-7 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors">
                <Edit className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Stats Grid - Next to Photo */}
            <div className="flex-1 grid grid-cols-3 gap-3 pt-1">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{watchlistCount}</div>
                <p className="text-xs text-white/60 mt-0.5">Watchlist</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-white">{reviewsCount}</div>
                <p className="text-xs text-white/60 mt-0.5">Reviews</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-xl font-bold text-white">{avgRating}</span>
                </div>
                <p className="text-xs text-white/60 mt-0.5">Avg Rating</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="pt-3 border-t border-white/10">
            <h2 className="text-xl font-bold text-white">{user.name}</h2>
            <p className="text-sm text-white/60 mt-0.5">{user.email}</p>
            <p className="text-xs text-white/40 mt-1">Member since {user.memberSince}</p>
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-zinc-900 rounded-2xl overflow-hidden mb-6 border border-white/10">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={item.action}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-white/60" />
                  <span className="text-white font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && (
                    <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-white/40" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Login/Logout Section */}
        {!isLoggedIn ? (
          <div className="space-y-3">
            <button
              onClick={() => navigate('/profile/login')}
              className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 rounded-2xl transition-all shadow-lg"
            >
              <LogIn className="w-5 h-5 text-white" />
              <span className="text-white font-bold">Login / Sign Up</span>
            </button>
            <p className="text-center text-sm text-white/50">
              Create an account to sync your data and unlock more features
            </p>
          </div>
        ) : (
          <button
            onClick={() => {
              setIsLoggedIn(false);
              // In a real app, clear user session here
            }}
            className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-red-600/20 hover:bg-red-600/30 rounded-2xl transition-colors border border-red-600/30"
          >
            <LogOut className="w-5 h-5 text-red-500" />
            <span className="text-red-500 font-semibold">Logout</span>
          </button>
        )}

        {/* App Info */}
        <div className="text-center mt-8 text-white/40 text-sm">
          <p>Faniverz v1.0.0</p>
          <p className="mt-1">Your gateway to Telugu cinema</p>
        </div>
      </div>
    </div>
  );
}
