// Utility functions for color contrast calculation

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

export const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

export const getContrastRatio = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 0;
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

export const getAccessibleTextColor = (backgroundColor: string): string => {
  const whiteContrast = getContrastRatio(backgroundColor, '#ffffff');
  const blackContrast = getContrastRatio(backgroundColor, '#000000');
  
  // Return color with better contrast (AA standard requires 4.5:1)
  return whiteContrast > blackContrast ? '#ffffff' : '#000000';
};

export const ensureAccessibleColor = (color: string): string => {
  const whiteContrast = getContrastRatio(color, '#ffffff');
  const blackContrast = getContrastRatio(color, '#000000');
  
  // If neither meets AA standard (4.5:1), adjust the color
  if (whiteContrast < 4.5 && blackContrast < 4.5) {
    const rgb = hexToRgb(color);
    if (!rgb) return color;
    
    // Darken or lighten the color to improve contrast
    const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
    if (luminance > 0.5) {
      // Lighten dark colors
      return adjustColorBrightness(color, 40);
    } else {
      // Darken light colors  
      return adjustColorBrightness(color, -40);
    }
  }
  
  return color;
};

export const adjustColorBrightness = (color: string, amount: number): string => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  
  const adjust = (c: number) => Math.max(0, Math.min(255, c + amount));
  
  const newR = adjust(rgb.r);
  const newG = adjust(rgb.g);
  const newB = adjust(rgb.b);
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};