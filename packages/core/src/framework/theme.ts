import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const colors = {
  brand: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  // Slate-based surface palette for dark UI elements (cards, sidebars)
  surface: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
};

const fonts = {
  heading: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif`,
  body: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif`,
  mono: `'JetBrains Mono', Menlo, Monaco, Consolas, monospace`,
};

const styles = {
  global: {
    'html, body': {
      bg: 'white',
      color: 'gray.800',
      fontSize: '13px',
      letterSpacing: '-0.011em',
    },
  },
};

const components = {
  Card: {
    baseStyle: {
      container: {
        bg: 'white',
        borderColor: 'gray.200',
      },
    },
  },
  Modal: {
    baseStyle: {
      dialog: {
        bg: 'white',
      },
    },
  },
  Menu: {
    baseStyle: {
      list: {
        bg: 'white',
        borderColor: 'gray.200',
      },
      item: {
        bg: 'white',
        color: 'gray.700',
        _hover: {
          bg: 'gray.50',
        },
      },
    },
  },
  Popover: {
    baseStyle: {
      content: {
        bg: 'white',
        borderColor: 'gray.200',
      },
    },
  },
  Tooltip: {
    baseStyle: {
      bg: 'gray.700',
      color: 'white',
    },
  },
  Input: {
    defaultProps: {
      focusBorderColor: 'brand.500',
    },
    variants: {
      outline: {
        field: {
          bg: 'white',
          borderColor: 'gray.300',
          color: 'gray.900',
          _placeholder: {
            color: 'gray.400',
          },
          _hover: {
            borderColor: 'gray.400',
          },
        },
      },
    },
  },
  Select: {
    defaultProps: {
      focusBorderColor: 'brand.500',
    },
    variants: {
      outline: {
        field: {
          bg: 'white',
          borderColor: 'gray.300',
          color: 'gray.900',
          _hover: {
            borderColor: 'gray.400',
          },
        },
      },
    },
  },
  Textarea: {
    defaultProps: {
      focusBorderColor: 'brand.500',
    },
    variants: {
      outline: {
        bg: 'white',
        borderColor: 'gray.300',
        color: 'gray.900',
        _placeholder: {
          color: 'gray.400',
        },
        _hover: {
          borderColor: 'gray.400',
        },
      },
    },
  },
  Button: {
    defaultProps: {
      colorScheme: 'brand',
    },
    variants: {
      ghost: {
        _hover: {
          bg: 'gray.100',
        },
      },
      outline: {
        borderColor: 'gray.300',
        _hover: {
          bg: 'gray.50',
        },
      },
    },
  },
  AlertDialog: {
    baseStyle: {
      dialog: {
        bg: 'white',
      },
    },
  },
};

/**
 * Base CruzJS Chakra UI theme.
 * Includes brand (indigo) and surface (slate) color palettes.
 *
 * @example
 * ```ts
 * import { createCruzTheme } from '@cruzjs/core/framework/theme';
 * export const theme = createCruzTheme();
 * // Or extend with app-specific overrides:
 * export const theme = createCruzTheme({ colors: { brand: { ... } } });
 * ```
 */
export function createCruzTheme(overrides: object = {}) {
  return extendTheme({ config, colors, fonts, styles, components }, overrides);
}
