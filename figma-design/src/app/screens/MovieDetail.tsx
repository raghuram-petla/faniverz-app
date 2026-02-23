import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Share2,
  Bookmark,
  BookmarkCheck,
  Play,
  Star,
  Calendar,
  Clock,
  AlertCircle,
  ThumbsUp,
  MessageSquare,
  ExternalLink,
  X,
} from 'lucide-react';
import { movies, reviews as allReviews, ottPlatforms } from '../data/movies';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [containsSpoiler, setContainsSpoiler] = useState(false);

  const movie = movies.find((m) => m.id === id);
  const movieReviews = allReviews.filter((r) => r.movieId === id);

  if (!movie) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Movie not found</p>
      </div>
    );
  }

  const platformsData = movie.ottPlatforms
    ? movie.ottPlatforms.map((pid) => ottPlatforms.find((p) => p.id === pid)!).filter(Boolean)
    : [];

  const handleSubmitReview = () => {
    // TODO: Submit review to backend
    console.log('Review submitted:', {
      movieId: movie.id,
      rating: userRating,
      title: reviewTitle,
      body: reviewBody,
      spoiler: containsSpoiler,
    });

    // Reset form
    setShowReviewModal(false);
    setUserRating(0);
    setHoverRating(0);
    setReviewTitle('');
    setReviewBody('');
    setContainsSpoiler(false);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="relative h-[500px]">
        {/* Backdrop Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${movie.backdrop})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <div className="max-w-md mx-auto px-4 pt-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="flex gap-2">
                <button className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors">
                  <Share2 className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => setIsWatchlisted(!isWatchlisted)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
                >
                  {isWatchlisted ? (
                    <BookmarkCheck className="w-5 h-5 text-red-500" />
                  ) : (
                    <Bookmark className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Movie Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 max-w-md mx-auto">
          <div className="flex gap-4">
            {/* Poster */}
            <div className="w-28 aspect-[2/3] rounded-xl overflow-hidden flex-shrink-0 shadow-2xl">
              <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {movie.releaseType === 'theatrical' && (
                  <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full uppercase">
                    In Theaters
                  </span>
                )}
                {movie.releaseType === 'ott' && (
                  <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full uppercase">
                    Streaming
                  </span>
                )}
                {movie.releaseType === 'upcoming' && (
                  <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full uppercase">
                    Upcoming
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-white mb-1">{movie.title}</h1>
              <div className="flex items-center gap-3 text-sm text-white/70 mb-3">
                {movie.rating > 0 && (
                  <>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-white">{movie.rating}</span>
                    </div>
                    <span>•</span>
                  </>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(movie.releaseDate).getFullYear()}
                </span>
                {movie.runtime > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {movie.runtime}m
                    </span>
                  </>
                )}
              </div>

              {/* Your Rating / Write Review */}
              {userRating > 0 ? (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Star
                        key={rating}
                        className={`w-4 h-4 ${
                          rating <= userRating ? 'fill-yellow-400 text-yellow-400' : 'text-white/30'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-white/70 mb-2">Your rating: {userRating}/5</p>
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
                  >
                    Edit Review
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Write Review
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 pb-20">
        {/* OTT Platforms / Watch Now */}
        {platformsData.length > 0 && (
          <div className="py-6 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white/60 mb-3">WATCH ON</h3>
            <div className="flex flex-wrap gap-3">
              {platformsData.map((platform) => (
                <button
                  key={platform.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:scale-105 transition-transform"
                  style={{ backgroundColor: platform.color }}
                >
                  <div className="text-2xl font-bold text-white">{platform.logo}</div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">{platform.name}</p>
                    <p className="text-xs text-white/80">Stream Now</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/80 ml-auto" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Release Date for Upcoming */}
        {movie.releaseType === 'upcoming' && (
          <div className="py-6 border-b border-white/10">
            <div className="flex items-center gap-3 p-4 bg-blue-600/20 border border-blue-600/30 rounded-xl">
              <AlertCircle className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm font-semibold text-white">Releasing on</p>
                <p className="text-lg font-bold text-blue-400">
                  {new Date(movie.releaseDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/5 rounded-xl p-1 mb-6">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white rounded-lg"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="cast"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white rounded-lg"
            >
              Cast
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white rounded-lg"
            >
              Reviews
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Synopsis */}
            <div>
              <h3 className="text-sm font-semibold text-white/60 mb-3">SYNOPSIS</h3>
              <p className="text-white/90 leading-relaxed">{movie.synopsis}</p>
            </div>

            {/* Genres */}
            <div>
              <h3 className="text-sm font-semibold text-white/60 mb-3">GENRES</h3>
              <div className="flex flex-wrap gap-2">
                {movie.genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-4 py-2 bg-white/10 rounded-full text-sm text-white"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            {/* Director & Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white/60 mb-2">DIRECTOR</h3>
                <p className="text-white font-medium">{movie.director}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/60 mb-2">CERTIFICATION</h3>
                <p className="text-white font-medium">{movie.certification}</p>
              </div>
            </div>

            {/* Trailer Button */}
            <Button className="w-full h-12 bg-white text-black hover:bg-white/90 font-semibold rounded-xl">
              <Play className="w-5 h-5 mr-2" />
              Watch Trailer
            </Button>
          </TabsContent>

          {/* Cast Tab */}
          <TabsContent value="cast" className="space-y-4">
            {movie.cast.map((member, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">{member.name}</p>
                  <p className="text-sm text-white/50 mt-1">as {member.role}</p>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            {/* Rating Summary */}
            {movie.rating > 0 && (
              <div className="p-6 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-8 h-8 fill-yellow-400 text-yellow-400" />
                  <span className="text-4xl font-bold text-white">{movie.rating}</span>
                  <span className="text-white/60">/5</span>
                </div>
                <p className="text-sm text-white/60">
                  {movie.reviewCount.toLocaleString()} reviews
                </p>
              </div>
            )}

            {/* Reviews List */}
            {movieReviews.length > 0 ? (
              <div className="space-y-4">
                {movieReviews.map((review) => (
                  <div key={review.id} className="p-4 bg-white/5 rounded-xl">
                    {/* User Info */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10">
                          <img
                            src={review.userPhoto}
                            alt={review.userName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{review.userName}</p>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-white/20'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-white/40">
                        {new Date(review.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Review Content */}
                    <h4 className="font-semibold text-white mb-2">{review.title}</h4>
                    <p className="text-sm text-white/80 leading-relaxed mb-3">{review.body}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-3 border-t border-white/5">
                      <button className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                        <ThumbsUp className="w-4 h-4" />
                        <span>{review.helpful}</span>
                      </button>
                      {review.spoiler && (
                        <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded">
                          Spoiler
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/60">No reviews yet</p>
                <p className="text-sm text-white/40 mt-1">Be the first to review this movie!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Write Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="h-full overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gradient-to-b from-black to-black/95 backdrop-blur-xl border-b border-white/10">
              <div className="max-w-md mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Write Review</h2>
                  <button
                    onClick={() => setShowReviewModal(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-6 space-y-6">
              {/* Movie Info */}
              <div className="flex gap-4 p-4 bg-white/5 rounded-xl">
                <div className="w-16 aspect-[2/3] rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white mb-1">{movie.title}</h3>
                  <p className="text-sm text-white/60">
                    {new Date(movie.releaseDate).getFullYear()} • {movie.director}
                  </p>
                </div>
              </div>

              {/* Rating Selection */}
              <div>
                <label className="block text-sm font-semibold text-white/60 mb-3">
                  YOUR RATING <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3 justify-center p-6 bg-white/5 rounded-xl">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setUserRating(rating)}
                      onMouseEnter={() => setHoverRating(rating)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-12 h-12 ${
                          rating <= (hoverRating || userRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-white/20'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {userRating > 0 && (
                  <p className="text-center text-white/60 text-sm mt-3">
                    You rated this <span className="font-bold text-yellow-400">{userRating}/5</span>
                  </p>
                )}
              </div>

              {/* Review Title */}
              <div>
                <label className="block text-sm font-semibold text-white/60 mb-3">
                  REVIEW TITLE
                </label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="Summarize your review..."
                  className="w-full px-4 py-3 bg-white/10 text-white placeholder-white/40 rounded-xl border border-white/10 focus:border-white/30 focus:bg-white/15 outline-none transition-colors"
                />
              </div>

              {/* Review Body */}
              <div>
                <label className="block text-sm font-semibold text-white/60 mb-3">
                  YOUR REVIEW
                </label>
                <textarea
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  placeholder="Share your thoughts about the movie..."
                  rows={8}
                  className="w-full px-4 py-3 bg-white/10 text-white placeholder-white/40 rounded-xl border border-white/10 focus:border-white/30 focus:bg-white/15 outline-none transition-colors resize-none"
                />
              </div>

              {/* Spoiler Warning Toggle */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <p className="font-semibold text-white mb-1">Contains Spoilers</p>
                  <p className="text-sm text-white/60">
                    Let others know if your review reveals plot details
                  </p>
                </div>
                <button
                  onClick={() => setContainsSpoiler(!containsSpoiler)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    containsSpoiler ? 'bg-red-600' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${
                      containsSpoiler ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="sticky bottom-0 bg-gradient-to-t from-black via-black to-black/95 backdrop-blur-xl border-t border-white/10">
              <div className="max-w-md mx-auto px-4 py-4 flex gap-3">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 py-3.5 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/15 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={userRating === 0}
                  className={`flex-1 py-3.5 rounded-xl font-semibold transition-colors shadow-lg ${
                    userRating === 0
                      ? 'bg-white/10 text-white/40 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/30'
                  }`}
                >
                  Submit Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
