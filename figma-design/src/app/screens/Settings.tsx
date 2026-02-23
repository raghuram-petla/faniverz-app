import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ChevronLeft,
  Bell,
  Lock,
  Eye,
  Globe,
  Download,
  Trash2,
  HelpCircle,
  FileText,
  Shield,
  ChevronRight,
} from 'lucide-react';

export function Settings() {
  const navigate = useNavigate();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [autoDownload, setAutoDownload] = useState(false);

  const settingsSections = [
    {
      title: 'Notifications',
      items: [
        {
          icon: Bell,
          label: 'Push Notifications',
          type: 'toggle',
          value: pushNotifications,
          onChange: setPushNotifications,
        },
        {
          icon: Bell,
          label: 'Email Notifications',
          type: 'toggle',
          value: emailNotifications,
          onChange: setEmailNotifications,
        },
      ],
    },
    {
      title: 'Privacy & Security',
      items: [
        {
          icon: Lock,
          label: 'Change Password',
          type: 'link',
          action: () => {},
        },
        {
          icon: Eye,
          label: 'Privacy Settings',
          type: 'link',
          action: () => {},
        },
        {
          icon: Shield,
          label: 'Two-Factor Authentication',
          type: 'link',
          action: () => {},
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: Globe,
          label: 'Language',
          type: 'link',
          value: 'English',
          action: () => {},
        },
        {
          icon: Download,
          label: 'Auto-Download Posters',
          type: 'toggle',
          value: autoDownload,
          onChange: setAutoDownload,
        },
      ],
    },
    {
      title: 'Data & Storage',
      items: [
        {
          icon: Trash2,
          label: 'Clear Cache',
          type: 'link',
          action: () => {},
        },
        {
          icon: Download,
          label: 'Download Data',
          type: 'link',
          action: () => {},
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: HelpCircle,
          label: 'Help & Support',
          type: 'link',
          action: () => {},
        },
        {
          icon: FileText,
          label: 'Terms of Service',
          type: 'link',
          action: () => {},
        },
        {
          icon: Shield,
          label: 'Privacy Policy',
          type: 'link',
          action: () => {},
        },
      ],
    },
  ];

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
            <h1 className="text-2xl font-bold text-white">Settings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {settingsSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h3 className="text-xs font-bold text-white/50 tracking-wider mb-3 px-1">
              {section.title.toUpperCase()}
            </h3>
            <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/10">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <div
                    key={itemIndex}
                    className="flex items-center justify-between px-5 py-4 border-b border-white/5 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-white/60" />
                      <span className="text-white font-medium">{item.label}</span>
                    </div>

                    {item.type === 'toggle' && (
                      <button
                        onClick={() => item.onChange?.(!item.value)}
                        className={`relative w-12 h-7 rounded-full transition-colors ${
                          item.value ? 'bg-red-600' : 'bg-white/20'
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                            item.value ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    )}

                    {item.type === 'link' && (
                      <button
                        onClick={item.action}
                        className="flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors"
                      >
                        {item.value && <span className="text-sm text-white/60">{item.value}</span>}
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* App Version */}
        <div className="text-center pt-8">
          <p className="text-white/40 text-sm">Faniverz v1.0.0</p>
          <p className="text-white/30 text-xs mt-1">Build 2024.02.23</p>
        </div>
      </div>
    </div>
  );
}
