// Instagram-style photo filters with CSS filter values
export interface Filter {
  name: string
  label: string
  css: string
  thumbnail?: string
}

export const FILTERS: Filter[] = [
  { name: 'none', label: 'Original', css: 'none' },
  { name: 'clarendon', label: 'Clarendon', css: 'contrast(1.2) saturate(1.35)' },
  { name: 'juno', label: 'Juno', css: 'contrast(1.1) brightness(1.1) saturate(1.4)' },
  { name: 'lark', label: 'Lark', css: 'contrast(0.9) brightness(1.15) saturate(1.2)' },
  { name: 'moon', label: 'Moon', css: 'grayscale(1) contrast(1.1) brightness(1.1)' },
  { name: 'reyes', label: 'Reyes', css: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)' },
  { name: 'slumber', label: 'Slumber', css: 'saturate(0.66) brightness(1.05) sepia(0.15)' },
  { name: 'aden', label: 'Aden', css: 'contrast(0.9) brightness(1.2) saturate(0.85) hue-rotate(20deg)' },
  { name: 'perpetua', label: 'Perpetua', css: 'contrast(1.1) brightness(1.1) saturate(1.1)' },
  { name: 'mayfair', label: 'Mayfair', css: 'contrast(1.1) brightness(1.15) saturate(1.1) sepia(0.06)' },
  { name: 'rise', label: 'Rise', css: 'brightness(1.05) saturate(0.9) contrast(0.95) sepia(0.1)' },
  { name: 'valencia', label: 'Valencia', css: 'contrast(1.08) brightness(1.08) sepia(0.08) saturate(1.2)' },
  { name: 'xpro2', label: 'X-Pro II', css: 'contrast(1.3) saturate(1.5) brightness(1.1) sepia(0.1)' },
  { name: 'willow', label: 'Willow', css: 'grayscale(0.5) contrast(0.95) brightness(0.9)' },
  { name: 'lofi', label: 'Lo-Fi', css: 'contrast(1.5) brightness(0.9) saturate(1.2)' },
  { name: 'earlybird', label: 'Earlybird', css: 'sepia(0.2) contrast(1.1) brightness(1.1) saturate(0.9)' },
  { name: 'brannan', label: 'Brannan', css: 'contrast(1.5) saturate(0.3) brightness(1.1) sepia(0.15)' },
  { name: 'hudson', label: 'Hudson', css: 'brightness(1.2) contrast(0.9) saturate(1.1) hue-rotate(-10deg)' },
  { name: 'inkwell', label: 'Inkwell', css: 'grayscale(1) brightness(1.1) contrast(1.1)' },
  { name: 'walden', label: 'Walden', css: 'brightness(1.1) saturate(1.6) hue-rotate(-10deg) sepia(0.3)' },
]

export const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', icon: 'crop_square', ratio: 1 },
  { id: '4:5', label: '4:5', icon: 'crop_portrait', ratio: 4 / 5 },
  { id: '16:9', label: '16:9', icon: 'crop_landscape', ratio: 16 / 9 },
  { id: 'original', label: 'Free', icon: 'crop_free', ratio: 0 }, // 0 = no crop
] as const

export type AspectRatioId = typeof ASPECT_RATIOS[number]['id']
