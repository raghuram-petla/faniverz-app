import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Camera, Save } from 'lucide-react';

export function EditProfile() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    phone: '+91 98765 43210',
    location: 'Hyderabad, India',
    bio: 'Passionate Telugu cinema enthusiast. Love action and thriller movies!',
    photo: 'https://images.unsplash.com/photo-1631819539802-720166c2651f?w=200',
  });

  const handleSave = () => {
    // Save logic here
    navigate('/profile');
  };

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-black to-black/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/profile')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-2xl font-bold text-white">Edit Profile</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Profile Photo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-3">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10">
              <img src={formData.photo} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <button className="absolute bottom-0 right-0 w-10 h-10 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg">
              <Camera className="w-5 h-5 text-white" />
            </button>
          </div>
          <button className="text-sm text-red-500 hover:text-red-400 font-medium">
            Change Photo
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-red-600 focus:bg-white/10 transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-red-600 focus:bg-white/10 transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-red-600 focus:bg-white/10 transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-red-600 focus:bg-white/10 transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-red-600 focus:bg-white/10 transition-colors resize-none"
              placeholder="Tell us about your movie preferences..."
            />
            <p className="text-xs text-white/40 mt-2">{formData.bio.length}/150 characters</p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full mt-8 flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-red-600/30"
        >
          <Save className="w-5 h-5" />
          Save Changes
        </button>
      </div>
    </div>
  );
}
