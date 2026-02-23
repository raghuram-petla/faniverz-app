import { createBrowserRouter, Navigate } from 'react-router';
import { Login } from './screens/Login';
import { MainLayout } from './screens/MainLayout';
import { Home } from './screens/Home';
import { Discover } from './screens/Discover';
import { Calendar } from './screens/Calendar';
import { Watchlist } from './screens/Watchlist';
import { Profile } from './screens/Profile';
import { MovieDetail } from './screens/MovieDetail';
import { Search } from './screens/Search';
import { EditProfile } from './screens/EditProfile';
import { Notifications } from './screens/Notifications';
import { MyReviews } from './screens/MyReviews';
import { Settings } from './screens/Settings';
import { FavoriteActors } from './screens/FavoriteActors';
import { WatchedMovies } from './screens/WatchedMovies';
import { Surprise } from './screens/Surprise';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: MainLayout,
    children: [
      { index: true, Component: Home },
      { path: 'discover', Component: Discover },
      { path: 'calendar', Component: Calendar },
      { path: 'watchlist', Component: Watchlist },
      { path: 'surprise', Component: Surprise },
      { path: 'profile', Component: Profile },
      { path: 'profile/edit', Component: EditProfile },
      { path: 'profile/notifications', Component: Notifications },
      { path: 'profile/reviews', Component: MyReviews },
      { path: 'profile/settings', Component: Settings },
      { path: 'profile/favorite-actors', Component: FavoriteActors },
      { path: 'profile/watched', Component: WatchedMovies },
      { path: 'profile/login', Component: Login },
      { path: 'notifications', Component: Notifications },
      { path: 'movie/:id', Component: MovieDetail },
      { path: 'search', Component: Search },
    ],
  },
  // Redirect /home to / for backwards compatibility
  { path: '/home', element: <Navigate to="/" replace /> },
]);
