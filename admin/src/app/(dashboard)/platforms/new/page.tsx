'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCreatePlatform } from '@/hooks/useAdminPlatforms';
import { useCountries } from '@/hooks/useAdminMovieAvailability';
import { useImageUpload } from '@/hooks/useImageUpload';
import { ImageUploadField } from '@/components/movie-edit/ImageUploadField';
import { ArrowLeft, Loader2, Plus, X } from 'lucide-react';
import { colors } from '@shared/colors';
import { SearchableCountryPicker } from '@/components/common/SearchableCountryPicker';
import Link from 'next/link';

function countryFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

export default function NewPlatformPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultCountry = searchParams.get('country') || 'IN';

  const createPlatform = useCreatePlatform();
  const { data: countries = [] } = useCountries();
  const { upload, uploading } = useImageUpload('/api/upload/platform-logo');

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [tmdbProviderId, setTmdbProviderId] = useState('');
  const [regions, setRegions] = useState<string[]>([defaultCountry]);
  const [addingCountry, setAddingCountry] = useState(false);

  async function handleLogoUpload(file: File) {
    try {
      const url = await upload(file);
      setLogoUrl(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  const handleAddCountry = (code: string) => {
    if (code && !regions.includes(code)) {
      setRegions((prev) => [...prev, code].sort());
    }
    setAddingCountry(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const id = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    createPlatform.mutate(
      {
        id,
        name: name.trim(),
        logo: name.charAt(0).toUpperCase() || '?',
        logo_url: logoUrl || null,
        tmdb_provider_id: tmdbProviderId.trim() ? Number(tmdbProviderId) : null,
        color: colors.zinc900,
        display_order: 0,
        regions,
      },
      { onSuccess: () => router.push('/platforms') },
    );
  };

  const availableCountries = countries.filter((c) => !regions.includes(c.code));

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/platforms" className="p-2 rounded-lg bg-input hover:bg-input-active">
          <ArrowLeft className="w-4 h-4 text-on-surface" />
        </Link>
        <h1 className="text-2xl font-bold text-on-surface">Add Platform</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-on-surface-muted mb-1">Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Netflix"
            className="w-full bg-input rounded-xl px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <ImageUploadField
          label="Logo"
          url={logoUrl}
          bucket="PLATFORMS"
          uploading={uploading}
          uploadEndpoint="/api/upload/platform-logo"
          previewAlt="Platform logo"
          previewClassName="w-20 h-20"
          showUrlCaption={false}
          onUpload={(file) => handleLogoUpload(file)}
          onRemove={() => setLogoUrl('')}
        />

        <div>
          <label className="block text-sm text-on-surface-muted mb-1">TMDB Provider ID</label>
          <input
            type="text"
            inputMode="numeric"
            value={tmdbProviderId}
            onChange={(e) => setTmdbProviderId(e.target.value)}
            placeholder="e.g. 119 (optional)"
            className="w-full bg-input rounded-xl px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        {/* Regions */}
        <div>
          <label className="block text-sm text-on-surface-muted mb-1">Countries</label>
          <div className="flex flex-wrap items-center gap-2">
            {regions.map((code) => {
              const c = countries.find((ct) => ct.code === code);
              return (
                <span
                  key={code}
                  className="flex items-center gap-1.5 bg-surface-elevated px-2.5 py-1 rounded-lg text-sm text-on-surface"
                >
                  {countryFlag(code)} {c?.name ?? code}
                  <button
                    type="button"
                    onClick={() => setRegions((prev) => prev.filter((r) => r !== code))}
                    className="text-on-surface-subtle hover:text-status-red"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              );
            })}
            {!addingCountry && (
              <button
                type="button"
                onClick={() => setAddingCountry(true)}
                className="flex items-center gap-1 text-sm text-on-surface-muted hover:text-on-surface"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            )}
          </div>
          {addingCountry && (
            <div className="mt-2">
              <SearchableCountryPicker
                countries={availableCountries}
                onSelect={handleAddCountry}
                onCancel={() => setAddingCountry(false)}
              />
            </div>
          )}
        </div>

        {createPlatform.isError && (
          <p className="text-status-red text-sm">Failed to create platform.</p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={createPlatform.isPending || !name.trim()}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            {createPlatform.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Create
          </button>
          <Link
            href="/platforms"
            className="px-6 py-2.5 text-on-surface-muted hover:text-on-surface"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
