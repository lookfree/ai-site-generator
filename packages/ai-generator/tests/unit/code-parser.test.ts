/**
 * 代码解析器测试
 */

import { describe, it, expect } from 'vitest';
import {
  parseAIResponse,
  isValidFilePath,
  normalizeLanguage,
  parseLegacyFormat,
  validateTsxCode,
  extractComponentName,
  extractPropsInterface,
  extractImports,
  inferComponentNameFromPath,
} from '../../src/services/code-parser';

describe('parseAIResponse', () => {
  it('should parse code blocks with file paths', () => {
    const response = `
Here is the code:

\`\`\`tsx:src/components/Hero.tsx
export default function Hero() {
  return <div>Hero</div>;
}
\`\`\`

\`\`\`tsx:src/App.tsx
export default function App() {
  return <Hero />;
}
\`\`\`
`;

    const result = parseAIResponse(response);

    expect(result.success).toBe(true);
    expect(result.files).toHaveLength(2);
    expect(result.files[0].path).toBe('src/components/Hero.tsx');
    expect(result.files[0].language).toBe('tsx');
    expect(result.files[1].path).toBe('src/App.tsx');
  });

  it('should handle CSS files', () => {
    const response = `
\`\`\`css:src/styles/globals.css
@tailwind base;
@tailwind components;
@tailwind utilities;
\`\`\`
`;

    const result = parseAIResponse(response);

    expect(result.success).toBe(true);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].language).toBe('css');
  });

  it('should report errors for invalid file paths', () => {
    const response = `
\`\`\`tsx:../outside/file.tsx
export default function Bad() {}
\`\`\`
`;

    const result = parseAIResponse(response);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Invalid file path');
  });

  it('should fall back to legacy format when no path specified', () => {
    const response = `
\`\`\`tsx
export default function App() {
  return <div>App</div>;
}
\`\`\`
`;

    const result = parseAIResponse(response);

    expect(result.success).toBe(true);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe('src/App.tsx');
  });
});

describe('isValidFilePath', () => {
  it('should accept valid paths', () => {
    expect(isValidFilePath('src/App.tsx')).toBe(true);
    expect(isValidFilePath('src/components/Hero.tsx')).toBe(true);
    expect(isValidFilePath('src/styles/globals.css')).toBe(true);
  });

  it('should reject paths outside src/', () => {
    expect(isValidFilePath('components/Hero.tsx')).toBe(false);
    expect(isValidFilePath('App.tsx')).toBe(false);
  });

  it('should reject paths with ..', () => {
    expect(isValidFilePath('src/../outside.tsx')).toBe(false);
  });

  it('should reject invalid extensions', () => {
    expect(isValidFilePath('src/file.exe')).toBe(false);
    expect(isValidFilePath('src/file.js')).toBe(false);
  });
});

describe('normalizeLanguage', () => {
  it('should normalize language names', () => {
    expect(normalizeLanguage('tsx')).toBe('tsx');
    expect(normalizeLanguage('typescript')).toBe('ts');
    expect(normalizeLanguage('ts')).toBe('ts');
    expect(normalizeLanguage('jsx')).toBe('tsx');
    expect(normalizeLanguage('javascript')).toBe('ts');
    expect(normalizeLanguage('css')).toBe('css');
    expect(normalizeLanguage('html')).toBe('html');
  });

  it('should return null for unknown languages', () => {
    expect(normalizeLanguage('python')).toBeNull();
    expect(normalizeLanguage('rust')).toBeNull();
  });

  it('should be case insensitive', () => {
    expect(normalizeLanguage('TSX')).toBe('tsx');
    expect(normalizeLanguage('TypeScript')).toBe('ts');
  });
});

describe('parseLegacyFormat', () => {
  it('should parse HTML blocks', () => {
    const response = `
\`\`\`html
<div>Hello</div>
\`\`\`
`;

    const files = parseLegacyFormat(response);

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('src/index.html');
    expect(files[0].language).toBe('html');
  });

  it('should parse CSS blocks', () => {
    const response = `
\`\`\`css
body { margin: 0; }
\`\`\`
`;

    const files = parseLegacyFormat(response);

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('src/styles/globals.css');
  });

  it('should parse JavaScript blocks', () => {
    const response = `
\`\`\`javascript
console.log('hello');
\`\`\`
`;

    const files = parseLegacyFormat(response);

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('src/main.ts');
  });
});

describe('validateTsxCode', () => {
  it('should pass valid code', () => {
    const code = `
export default function Hero() {
  return <div>Hero</div>;
}
`;

    const errors = validateTsxCode(code, 'src/App.tsx');

    expect(errors).toHaveLength(0);
  });

  it('should detect missing default export', () => {
    const code = `
function Hero() {
  return <div>Hero</div>;
}
`;

    const errors = validateTsxCode(code, 'src/App.tsx');

    expect(errors.some(e => e.includes('Missing default export'))).toBe(true);
  });

  it('should detect inline styles', () => {
    const code = `
export default function Hero() {
  return <div style={{ color: 'red' }}>Hero</div>;
}
`;

    const errors = validateTsxCode(code, 'src/App.tsx');

    expect(errors.some(e => e.includes('inline styles'))).toBe(true);
  });

  it('should detect missing Props interface for components with props', () => {
    const code = `
export default function Hero({ title }) {
  return <h1>{title}</h1>;
}
`;

    const errors = validateTsxCode(code, 'src/components/Hero.tsx');

    expect(errors.some(e => e.includes('Props interface'))).toBe(true);
  });

  it('should detect missing React hooks import', () => {
    const code = `
export default function Counter() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}
`;

    const errors = validateTsxCode(code, 'src/App.tsx');

    expect(errors.some(e => e.includes('React hooks import'))).toBe(true);
  });
});

describe('extractComponentName', () => {
  it('should extract from function declaration', () => {
    const code = `export default function Hero() {}`;

    expect(extractComponentName(code)).toBe('Hero');
  });

  it('should extract from const export', () => {
    const code = `
const Hero = () => {};
export default Hero;
`;

    expect(extractComponentName(code)).toBe('Hero');
  });

  it('should return null for no export', () => {
    const code = `function Hero() {}`;

    expect(extractComponentName(code)).toBeNull();
  });
});

describe('extractPropsInterface', () => {
  it('should extract interface', () => {
    const code = `
interface HeroProps {
  title: string;
  subtitle?: string;
}

export default function Hero(props: HeroProps) {}
`;

    const result = extractPropsInterface(code);

    expect(result).toContain('interface HeroProps');
    expect(result).toContain('title: string');
  });

  it('should extract type alias', () => {
    const code = `
type HeroProps = {
  title: string;
}

export default function Hero(props: HeroProps) {}
`;

    const result = extractPropsInterface(code);

    expect(result).toContain('type HeroProps');
  });
});

describe('extractImports', () => {
  it('should extract all imports', () => {
    const code = `
import React from 'react';
import { useState, useEffect } from 'react';
import './styles.css';
`;

    const imports = extractImports(code);

    expect(imports).toHaveLength(3);
  });
});

describe('inferComponentNameFromPath', () => {
  it('should infer name from file path', () => {
    expect(inferComponentNameFromPath('src/components/Hero.tsx')).toBe('Hero');
    expect(inferComponentNameFromPath('src/App.tsx')).toBe('App');
    expect(inferComponentNameFromPath('src/components/sections/Features.tsx')).toBe('Features');
  });
});
