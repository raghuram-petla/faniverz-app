import { useNavigate } from 'react-router';
import { Bell, Film, Calendar, Star, TrendingUp, X, ChevronLeft } from 'lucide-react';
import { movies, ottPlatforms } from '../data/movies';

type NotificationType = 'release' | 'watchlist' | 'trending' | 'reminder';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  movieId?: string;
  moviePoster?: string;
  platform?: string;
  read: boolean;
}

export function Notifications() {
  const navigate = useNavigate();

  // Generate sample notifications based on movie data
  const notifications: Notification[] = [
    {
      id: '1',
      type: 'release',
      title: 'New Release Alert!',
      message: `${movies[0]?.title} is now streaming on ${ottPlatforms.find((p) => p.id === movies[0]?.ottPlatforms?.[0])?.name}`,
      timestamp: '2 hours ago',
      movieId: movies[0]?.id,
      moviePoster: movies[0]?.poster,
      platform: movies[0]?.ottPlatforms?.[0],
      read: false,
    },
    {
      id: '2',
      type: 'reminder',
      title: 'Coming Soon Reminder',
      message: `${movies.find((m) => m.releaseType === 'upcoming')?.title} releases in theaters tomorrow!`,
      timestamp: '5 hours ago',
      movieId: movies.find((m) => m.releaseType === 'upcoming')?.id,
      moviePoster: movies.find((m) => m.releaseType === 'upcoming')?.poster,
      read: false,
    },
    {
      id: '3',
      type: 'trending',
      title: 'Trending Now',
      message: `${movies[1]?.title} is trending #1 in Telugu movies this week`,
      timestamp: '1 day ago',
      movieId: movies[1]?.id,
      moviePoster: movies[1]?.poster,
      read: true,
    },
    {
      id: '4',
      type: 'watchlist',
      title: 'Watchlist Update',
      message: 'A movie from your watchlist is now available to stream',
      timestamp: '2 days ago',
      movieId: movies[2]?.id,
      moviePoster: movies[2]?.poster,
      platform: movies[2]?.ottPlatforms?.[0],
      read: true,
    },
    {
      id: '5',
      type: 'release',
      title: 'New OTT Release',
      message: `${movies[3]?.title} just dropped on ${ottPlatforms.find((p) => p.id === movies[3]?.ottPlatforms?.[0])?.name}`,
      timestamp: '3 days ago',
      movieId: movies[3]?.id,
      moviePoster: movies[3]?.poster,
      platform: movies[3]?.ottPlatforms?.[0],
      read: true,
    },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'release':
        return <Film className="w-5 h-5 text-purple-500" />;
      case 'reminder':
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'trending':
        return <TrendingUp className="w-5 h-5 text-red-500" />;
      case 'watchlist':
        return <Star className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-white/60" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.movieId) {
      navigate(`/movie/${notification.movieId}`);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-black via-black to-black/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-md mx-auto px-4 pt-4 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-white/60">
                  {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button className="text-sm text-red-500 hover:text-red-400 font-medium">
                Mark all read
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto">
        {notifications.length > 0 ? (
          <div className="divide-y divide-white/5">
            {notifications.map((notification) => {
              const platform = notification.platform
                ? ottPlatforms.find((p) => p.id === notification.platform)
                : null;

              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full px-4 py-4 flex gap-3 hover:bg-white/5 transition-colors text-left ${
                    !notification.read ? 'bg-white/5' : ''
                  }`}
                >
                  {/* Movie Poster */}
                  {notification.moviePoster && (
                    <div className="flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden bg-white/5">
                      <img
                        src={notification.moviePoster}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <h3
                          className={`font-semibold text-sm mb-1 ${
                            !notification.read ? 'text-white' : 'text-white/70'
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <p
                          className={`text-sm leading-relaxed ${
                            !notification.read ? 'text-white/80' : 'text-white/50'
                          }`}
                        >
                          {notification.message}
                        </p>

                        {/* Platform Badge */}
                        {platform && (
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg mt-2 text-xs font-bold text-white"
                            style={{ backgroundColor: platform.color }}
                          >
                            <span>{platform.logo}</span>
                            <span>{platform.name}</span>
                          </div>
                        )}
                      </div>

                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-1" />
                      )}
                    </div>

                    <p className="text-xs text-white/40 mt-2">{notification.timestamp}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 px-4">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-white/20" />
            </div>
            <p className="text-white/60 text-lg font-medium mb-1">No notifications yet</p>
            <p className="text-sm text-white/40">We'll notify you about new releases and updates</p>
          </div>
        )}
      </div>
    </div>
  );
}
