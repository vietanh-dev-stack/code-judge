export const bannerColors = [
  'bg-slate-700',
  'bg-blue-600',
  'bg-teal-600',
  'bg-purple-600',
  'bg-emerald-600',
];

export function getClassroomBannerColor(id: string) {
  let hash = 0;

  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  return bannerColors[Math.abs(hash) % bannerColors.length];
}
