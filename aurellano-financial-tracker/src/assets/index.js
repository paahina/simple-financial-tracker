export const colors = {
  primary: '#3A3A3A',
  primaryTint: '#6E6E6E',
  primaryShade: '#1F1F1F',
  neutral0: '#FFFFFF',
  neutral50: '#F5F5F5',
  neutral200: '#E5E5E5',
  neutral500: '#737373',
  neutral900: '#171717',
  errorForeground: '#FF2D2D',
  edit: '#2563EB',
  editTint: '#DBEAFE',
  warning: '#D97706',
  warningTint: '#FEF3C7',
  destructive: '#DC2626',
  destructiveShade: '#B91C1C',
  destructiveTint: '#FEE2E2',
  success: '#15803D',
  successTint: '#DCFCE7',
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
  '--error-foreground': colors.errorForeground,
  '--edit': colors.edit,
  '--edit-tint': colors.editTint,
  '--warning': colors.warning,
  '--warning-tint': colors.warningTint,
  '--destructive': colors.destructive,
  '--destructive-shade': colors.destructiveShade,
  '--destructive-tint': colors.destructiveTint,
  '--success': colors.success,
  '--success-tint': colors.successTint,
};

export function applyTheme(target = document.documentElement) {
  Object.entries(cssVariables).forEach(([name, value]) => {
    target.style.setProperty(name, value);
  });
}
