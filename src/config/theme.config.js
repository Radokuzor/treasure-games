// Theme Configuration for Grab The Cash App
// Supports multiple gradient-based themes

export const THEMES = {
  // ADD THIS NEW THEME FIRST
  mintFresh: {
    name: 'Mint Fresh',
    gradients: {
      primary: ['#00D9F5', '#00F5D0', '#B4F8C8'],
      secondary: ['#80FFDB', '#72EFDD', '#64DFDF'],
      accent: ['#00E5CC', '#00D4E5'],
      background: ['#E8F9FD', '#D4F1F4', '#B5EAD7'],
      card: ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)'],
    },
    colors: {
      text: '#1A1A2E',
      textSecondary: 'rgba(26, 26, 46, 0.6)',
      cardBg: 'rgba(255, 255, 255, 0.9)',
      border: 'rgba(0, 213, 229, 0.2)',
      success: '#00D4AA',
      warning: '#FFA726',
      error: '#EF5350',
    },
  },
  sunset: {
    name: 'Sunset Dark',
    gradients: {
      primary: ['#FF6B9D', '#FEC163', '#C644FC'],
      secondary: ['#667eea', '#764ba2'],
      accent: ['#f093fb', '#f5576c'],
      background: ['#0F2027', '#203A43', '#2C5364'],
      card: ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)'],
    },
    colors: {
      text: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      cardBg: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.1)',
      success: '#4ADE80',
      warning: '#FBBF24',
      error: '#EF4444',
    },
  },
  ocean: {
    name: 'Ocean',
    gradients: {
      primary: ['#0093E9', '#80D0C7'],
      secondary: ['#2E3192', '#1BFFFF'],
      accent: ['#4F46E5', '#06B6D4'],
      background: ['#134E5E', '#71B280'],
      card: ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)'],
    },
    colors: {
      text: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      cardBg: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.1)',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
  },
  aurora: {
    name: 'Aurora',
    gradients: {
      primary: ['#A8EDEA', '#FED6E3'],
      secondary: ['#FF9A9E', '#FAD0C4', '#FBC2EB'],
      accent: ['#FA709A', '#FEE140'],
      background: ['#0F2027', '#203A43', '#2C5364'],
      card: ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)'],
    },
    colors: {
      text: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      cardBg: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.1)',
      success: '#34D399',
      warning: '#FBBF24',
      error: '#F87171',
    },
  },
  neon: {
    name: 'Neon',
    gradients: {
      primary: ['#00F5A0', '#00D9F5'],
      secondary: ['#FD1D1D', '#FCB045'],
      accent: ['#B224EF', '#7579FF'],
      background: ['#141E30', '#243B55'],
      card: ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)'],
    },
    colors: {
      text: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      cardBg: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.1)',
      success: '#22C55E',
      warning: '#FBBF24',
      error: '#EF4444',
    },
  },
  cosmic: {
    name: 'Cosmic',
    gradients: {
      primary: ['#7F00FF', '#E100FF'],
      secondary: ['#FC466B', '#3F5EFB'],
      accent: ['#FF0080', '#FF8C00', '#40E0D0'],
      background: ['#1A1A2E', '#16213E', '#0F3460'],
      card: ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)'],
    },
    colors: {
      text: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      cardBg: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.1)',
      success: '#4ADE80',
      warning: '#FBBF24',
      error: '#F87171',
    },
  },
  forest: {
    name: 'Forest',
    gradients: {
      primary: ['#11998e', '#38ef7d'],
      secondary: ['#56ab2f', '#a8e063'],
      accent: ['#02AAB0', '#00CDAC'],
      background: ['#1F4037', '#99f2c8'],
      card: ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)'],
    },
    colors: {
      text: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      cardBg: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.1)',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
  },
};

export const DEFAULT_THEME = 'mintFresh';
