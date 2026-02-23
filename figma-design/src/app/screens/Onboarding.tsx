import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Film, Calendar, Star, Heart, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';

const slides = [
  {
    icon: Film,
    title: 'Your Telugu Cinema Hub',
    description:
      'Discover every Telugu movie release—theaters and streaming platforms, all in one place',
    gradient: 'from-red-600 via-orange-500 to-yellow-500',
    image:
      'https://images.unsplash.com/photo-1757186202331-e72fee53815f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaW5lbWElMjB0aGVhdGVyJTIwZGFyayUyMG1vb2R5fGVufDF8fHx8MTc3MTc5ODU5M3ww&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    icon: Calendar,
    title: 'Never Miss a Release',
    description: 'Get notified before your favorite movies hit theaters or start streaming on OTT',
    gradient: 'from-purple-600 via-pink-500 to-red-500',
    image:
      'https://images.unsplash.com/photo-1760030428042-f2bd83bc03ba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3ZpZSUyMHByZW1pZXJlJTIwcmVkJTIwY2FycGV0fGVufDF8fHx8MTc3MTc2OTk1Mnww&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    icon: Star,
    title: 'Reviews from Real Fans',
    description: 'Read honest reviews from fellow Telugu movie lovers before you watch',
    gradient: 'from-blue-600 via-cyan-500 to-teal-500',
    image:
      'https://images.unsplash.com/photo-1715614176939-f5c46ae99d04?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmdXR1cmlzdGljJTIwY2l0eSUyMG5lb24lMjBsaWdodHN8ZW58MXx8fHwxNzcxNzg2ODUyfDA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    icon: Heart,
    title: 'Your Personal Watchlist',
    description: "Save movies to your watchlist and get reminders when they're available to watch",
    gradient: 'from-pink-600 via-rose-500 to-red-600',
    image:
      'https://images.unsplash.com/photo-1751662314800-f68119320ccb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhY3Rpb24lMjBtb3ZpZSUyMGludGVuc2UlMjBmb3Jlc3R8ZW58MXx8fHwxNzcxODA4MDYwfDA&ixlib=rb-4.1.0&q=80&w=1080',
  },
];

export function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate('/login');
    }
  };

  const handleSkip = () => {
    navigate('/login');
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Background Image with Overlay */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${slide.image})` }}
          />
          <div className={`absolute inset-0 bg-gradient-to-b ${slide.gradient} opacity-80`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative h-full flex flex-col max-w-md mx-auto px-6">
        {/* Skip Button */}
        <div className="flex justify-end pt-6">
          <button
            onClick={handleSkip}
            className="text-white/80 hover:text-white transition-colors px-4 py-2"
          >
            Skip
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center"
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.3 }}
                className="flex justify-center mb-8"
              >
                <div className="bg-white/10 backdrop-blur-md rounded-full p-6 border border-white/20">
                  <Icon className="w-16 h-16 text-white" />
                </div>
              </motion.div>

              {/* Title */}
              <h1 className="text-4xl font-bold text-white mb-3">{slide.title}</h1>

              {/* Description */}
              <p className="text-lg text-white/90 leading-relaxed max-w-sm mx-auto">
                {slide.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Section */}
        <div className="pb-8 space-y-6">
          {/* Pagination Dots */}
          <div className="flex justify-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/30'
                }`}
              />
            ))}
          </div>

          {/* Next Button */}
          <Button
            onClick={handleNext}
            className="w-full h-14 text-lg font-semibold bg-white text-black hover:bg-white/90 rounded-full"
          >
            {currentSlide < slides.length - 1 ? (
              <>
                Next
                <ChevronRight className="ml-2 w-5 h-5" />
              </>
            ) : (
              'Get Started'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
