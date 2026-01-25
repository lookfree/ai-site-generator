/**
 * CSS 解析工具
 */

/**
 * 解析 CSS 属性值
 */
export function parseCssValue(value: string): {
  number: number | null;
  unit: string | null;
} {
  const match = value.match(/^(-?\d+\.?\d*)(px|em|rem|%|vh|vw)?$/);

  if (!match) {
    return { number: null, unit: null };
  }

  return {
    number: parseFloat(match[1]),
    unit: match[2] || null,
  };
}

/**
 * 格式化 CSS 值
 */
export function formatCssValue(number: number, unit: string = 'px'): string {
  return `${number}${unit}`;
}

/**
 * 解析简写属性 (如 margin, padding)
 */
export function parseShorthand(value: string): {
  top: string;
  right: string;
  bottom: string;
  left: string;
} {
  const parts = value.split(/\s+/).filter(Boolean);

  switch (parts.length) {
    case 1:
      return {
        top: parts[0],
        right: parts[0],
        bottom: parts[0],
        left: parts[0],
      };
    case 2:
      return {
        top: parts[0],
        right: parts[1],
        bottom: parts[0],
        left: parts[1],
      };
    case 3:
      return {
        top: parts[0],
        right: parts[1],
        bottom: parts[2],
        left: parts[1],
      };
    case 4:
      return {
        top: parts[0],
        right: parts[1],
        bottom: parts[2],
        left: parts[3],
      };
    default:
      return {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      };
  }
}

/**
 * 解析颜色值
 */
export function parseColor(color: string): {
  r: number;
  g: number;
  b: number;
  a: number;
} | null {
  // Hex
  const hexMatch = color.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
  }

  // RGB/RGBA
  const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  return null;
}

/**
 * 颜色转 Hex
 */
export function colorToHex(color: { r: number; g: number; b: number; a?: number }): string {
  const hex = ((1 << 24) + (color.r << 16) + (color.g << 8) + color.b)
    .toString(16)
    .slice(1);

  if (color.a !== undefined && color.a < 1) {
    const alpha = Math.round(color.a * 255)
      .toString(16)
      .padStart(2, '0');
    return `#${hex}${alpha}`;
  }

  return `#${hex}`;
}

/**
 * 颜色转 RGB
 */
export function colorToRgb(color: { r: number; g: number; b: number; a?: number }): string {
  if (color.a !== undefined && color.a < 1) {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
  }
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

/**
 * 解析 box-shadow
 */
export function parseBoxShadow(shadow: string): Array<{
  inset: boolean;
  offsetX: string;
  offsetY: string;
  blurRadius: string;
  spreadRadius: string;
  color: string;
}> {
  if (shadow === 'none' || !shadow) {
    return [];
  }

  // 简化解析，只处理单个阴影
  const parts = shadow.split(/,(?![^(]*\))/);

  return parts.map(part => {
    const trimmed = part.trim();
    const inset = trimmed.startsWith('inset');
    const values = trimmed.replace('inset', '').trim().split(/\s+/);

    return {
      inset,
      offsetX: values[0] || '0',
      offsetY: values[1] || '0',
      blurRadius: values[2] || '0',
      spreadRadius: values[3] || '0',
      color: values.slice(4).join(' ') || 'rgba(0,0,0,0.1)',
    };
  });
}

/**
 * 解析 border
 */
export function parseBorder(border: string): {
  width: string;
  style: string;
  color: string;
} {
  const parts = border.split(/\s+/);

  return {
    width: parts[0] || '0',
    style: parts[1] || 'solid',
    color: parts.slice(2).join(' ') || 'currentColor',
  };
}
