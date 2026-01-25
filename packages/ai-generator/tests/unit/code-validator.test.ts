/**
 * 代码验证器测试
 */

import { describe, it, expect } from 'vitest';
import {
  validateFiles,
  validateProjectStructure,
  mergeValidationResults,
  formatValidationResult,
} from '../../src/services/code-validator';
import type { ParsedFile } from '../../src/types';

describe('validateFiles', () => {
  it('should pass valid files', () => {
    const files: ParsedFile[] = [
      {
        path: 'src/App.tsx',
        content: `export default function App() {
  return <div className="container">Hello</div>;
}`,
        language: 'tsx',
      },
    ];

    const result = validateFiles(files);

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect inline styles', () => {
    const files: ParsedFile[] = [
      {
        path: 'src/App.tsx',
        content: `export default function App() {
  return <div style={{ color: 'red' }}>Hello</div>;
}`,
        language: 'tsx',
      },
    ];

    const result = validateFiles(files, { checkInlineStyles: true });

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.message.includes('inline styles'))).toBe(true);
  });

  it('should skip inline style check when disabled', () => {
    const files: ParsedFile[] = [
      {
        path: 'src/App.tsx',
        content: `export default function App() {
  return <div style={{ color: 'red' }}>Hello</div>;
}`,
        language: 'tsx',
      },
    ];

    const result = validateFiles(files, { checkInlineStyles: false });

    expect(result.errors.some(e => e.message.includes('inline styles'))).toBe(false);
  });

  it('should warn about console statements', () => {
    const files: ParsedFile[] = [
      {
        path: 'src/App.tsx',
        content: `export default function App() {
  console.log('debug');
  return <div>Hello</div>;
}`,
        language: 'tsx',
      },
    ];

    const result = validateFiles(files);

    expect(result.warnings.some(w => w.message.includes('console'))).toBe(true);
  });

  it('should warn about TODO comments', () => {
    const files: ParsedFile[] = [
      {
        path: 'src/App.tsx',
        content: `export default function App() {
  // TODO: fix this
  return <div>Hello</div>;
}`,
        language: 'tsx',
      },
    ];

    const result = validateFiles(files);

    expect(result.warnings.some(w => w.message.includes('TODO'))).toBe(true);
  });

  it('should warn about any type', () => {
    const files: ParsedFile[] = [
      {
        path: 'src/App.tsx',
        content: `export default function App() {
  const data: any = {};
  return <div>Hello</div>;
}`,
        language: 'tsx',
      },
    ];

    const result = validateFiles(files);

    expect(result.warnings.some(w => w.message.includes('any'))).toBe(true);
  });

  it('should detect multiple default exports', () => {
    const files: ParsedFile[] = [
      {
        path: 'src/App.tsx',
        content: `
export default function App() {}
export default function Other() {}
`,
        language: 'tsx',
      },
    ];

    const result = validateFiles(files);

    expect(result.errors.some(e => e.message.includes('multiple default exports'))).toBe(true);
  });

  it('should validate CSS files', () => {
    const files: ParsedFile[] = [
      {
        path: 'src/styles/custom.css',
        content: `
.custom { color: red; }
.another { background: blue; }
`,
        language: 'css',
      },
    ];

    const result = validateFiles(files);

    expect(result.warnings.some(w => w.message.includes('@tailwind'))).toBe(true);
  });

  it('should skip non-ts/tsx files for code validation', () => {
    const files: ParsedFile[] = [
      {
        path: 'src/data.json',
        content: `{"key": "value"}`,
        language: 'json',
      },
    ];

    const result = validateFiles(files);

    expect(result.success).toBe(true);
  });
});

describe('validateProjectStructure', () => {
  it('should pass with required files', () => {
    const files: ParsedFile[] = [
      { path: 'src/main.tsx', content: '', language: 'tsx' },
      { path: 'src/App.tsx', content: '', language: 'tsx' },
    ];

    const result = validateProjectStructure(files);

    expect(result.success).toBe(true);
  });

  it('should fail without main.tsx', () => {
    const files: ParsedFile[] = [
      { path: 'src/App.tsx', content: '', language: 'tsx' },
    ];

    const result = validateProjectStructure(files);

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.message.includes('main.tsx'))).toBe(true);
  });

  it('should fail without App.tsx', () => {
    const files: ParsedFile[] = [
      { path: 'src/main.tsx', content: '', language: 'tsx' },
    ];

    const result = validateProjectStructure(files);

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.message.includes('App.tsx'))).toBe(true);
  });

  it('should warn about missing components directory', () => {
    const files: ParsedFile[] = [
      { path: 'src/main.tsx', content: '', language: 'tsx' },
      { path: 'src/App.tsx', content: '', language: 'tsx' },
    ];

    const result = validateProjectStructure(files);

    expect(result.warnings.some(w => w.message.includes('components'))).toBe(true);
  });

  it('should not warn when components directory exists', () => {
    const files: ParsedFile[] = [
      { path: 'src/main.tsx', content: '', language: 'tsx' },
      { path: 'src/App.tsx', content: '', language: 'tsx' },
      { path: 'src/components/Hero.tsx', content: '', language: 'tsx' },
    ];

    const result = validateProjectStructure(files);

    expect(result.warnings.some(w => w.message.includes('No components'))).toBe(false);
  });
});

describe('mergeValidationResults', () => {
  it('should merge multiple results', () => {
    const result1 = {
      success: true,
      errors: [],
      warnings: [{ file: 'a.tsx', message: 'warn1' }],
    };

    const result2 = {
      success: false,
      errors: [{ file: 'b.tsx', message: 'error1' }],
      warnings: [],
    };

    const merged = mergeValidationResults(result1, result2);

    expect(merged.success).toBe(false);
    expect(merged.errors).toHaveLength(1);
    expect(merged.warnings).toHaveLength(1);
  });

  it('should be successful only when all are successful', () => {
    const result1 = { success: true, errors: [], warnings: [] };
    const result2 = { success: true, errors: [], warnings: [] };

    const merged = mergeValidationResults(result1, result2);

    expect(merged.success).toBe(true);
  });
});

describe('formatValidationResult', () => {
  it('should format success', () => {
    const result = { success: true, errors: [], warnings: [] };

    const formatted = formatValidationResult(result);

    expect(formatted).toContain('Validation passed');
  });

  it('should format errors', () => {
    const result = {
      success: false,
      errors: [
        { file: 'src/App.tsx', line: 10, column: 5, message: 'Error message' },
      ],
      warnings: [],
    };

    const formatted = formatValidationResult(result);

    expect(formatted).toContain('Validation failed');
    expect(formatted).toContain('src/App.tsx:10:5');
    expect(formatted).toContain('Error message');
  });

  it('should format warnings', () => {
    const result = {
      success: true,
      errors: [],
      warnings: [
        { file: 'src/App.tsx', line: 5, message: 'Warning message' },
      ],
    };

    const formatted = formatValidationResult(result);

    expect(formatted).toContain('Warnings');
    expect(formatted).toContain('Warning message');
  });
});
