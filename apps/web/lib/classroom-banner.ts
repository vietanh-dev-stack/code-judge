export const bannerColors = [
  'bg-slate-700',
  'bg-blue-600',
  'bg-teal-600',
  'bg-purple-600',
  'bg-emerald-600',
];

/** Canonical classroom banners (Teaching + Enrolled share this pool, keyed by classroom id). */
export const bannerImages = [
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=600&auto=format&fit=crop',
];

export function getClassroomBannerColor(id: string) {
  let hash = 0;

  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  return bannerColors[Math.abs(hash) % bannerColors.length];
}

export function getClassroomBannerImage(id: string) {
  let hash = 0;

  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  return bannerImages[Math.abs(hash) % bannerImages.length];
}
