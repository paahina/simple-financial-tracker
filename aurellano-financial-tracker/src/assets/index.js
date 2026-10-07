export const colors = {
  primary: '#3A3A3A',
  primaryTint: '#6E6E6E',
  primaryShade: '#1F1F1F',
  neutral0: '#FFFFFF',
  neutral50: '#F5F5F5',
  neutral200: '#E5E5E5',
  neutral500: '#737373',
  neutral900: '#171717',
};

const cssVariables = {
  '--primary': colors.primary,
  '--primary-tint': colors.primaryTint,
  '--primary-shade': colors.primaryShade,
  '--neutral-0': colors.neutral0,
  '--neutral-50': colors.neutral50,
  '--neutral-200': colors.neutral200,
  '--neutral-500': colors.neutral500,
  '--neutral-900': colors.neutral900,
};

export function applyTheme(target = document.documentElement) {
  Object.entries(cssVariables).forEach(([name, value]) => {
    target.style.setProperty(name, value);
  });
}
