/**
 * AI 生成器测试
 */

import { describe, it, expect, vi } from 'vitest';
import {
  AIGenerator,
  createAIGenerator,
  aiGenerator,
  type AIClient,
} from '../../src/services/ai-generator';

describe('AIGenerator', () => {
  const mockConfig = {
    projectId: 'test-123',
    projectName: 'Test Project',
    description: 'A test project',
  };

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const generator = new AIGenerator();

      expect(generator).toBeInstanceOf(AIGenerator);
    });

    it('should create instance with custom options', () => {
      const generator = new AIGenerator({
        validateCode: false,
        useJsxTagger: false,
      });

      expect(generator).toBeInstanceOf(AIGenerator);
    });
  });

  describe('generateScaffoldOnly', () => {
    it('should generate scaffold files', () => {
      const generator = new AIGenerator();

      const files = generator.generateScaffoldOnly(mockConfig);

      expect(files.length).toBeGreaterThan(0);
      expect(files.some(f => f.path === 'package.json')).toBe(true);
      expect(files.some(f => f.path === 'vite.config.ts')).toBe(true);
    });

    it('should include jsx-tagger by default', () => {
      const generator = new AIGenerator({ useJsxTagger: true });

      const files = generator.generateScaffoldOnly(mockConfig);
      const viteConfig = files.find(f => f.path === 'vite.config.ts');

      expect(viteConfig).toBeDefined();
      expect(viteConfig!.content).toContain('jsxTaggerPlugin');
    });

    it('should not include jsx-tagger when disabled', () => {
      const generator = new AIGenerator({ useJsxTagger: false });

      const files = generator.generateScaffoldOnly(mockConfig);
      const viteConfig = files.find(f => f.path === 'vite.config.ts');

      expect(viteConfig).toBeDefined();
      expect(viteConfig!.content).not.toContain('jsxTaggerPlugin');
    });
  });

  describe('generate', () => {
    it('should generate project without AI client', async () => {
      const generator = new AIGenerator({ validateCode: false });

      const result = await generator.generate({
        description: 'A landing page',
        config: mockConfig,
      });

      expect(result.success).toBe(true);
      expect(result.scaffoldFiles.length).toBeGreaterThan(0);
      expect(result.componentFiles.length).toBeGreaterThan(0);
      expect(result.componentFiles[0].path).toBe('src/App.tsx');
    });

    it('should use AI client when provided', async () => {
      const mockAIClient: AIClient = {
        generate: vi.fn().mockResolvedValue(`
\`\`\`tsx:src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
\`\`\`

\`\`\`tsx:src/App.tsx
export default function App() {
  return <div>Generated App</div>;
}
\`\`\`
`),
      };

      const generator = new AIGenerator({
        aiClient: mockAIClient,
        validateCode: false,
      });

      const result = await generator.generate({
        description: 'A landing page',
        config: mockConfig,
      });

      expect(mockAIClient.generate).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.componentFiles).toHaveLength(2);
    });

    it('should validate generated code', async () => {
      const mockAIClient: AIClient = {
        generate: vi.fn().mockResolvedValue(`
\`\`\`tsx:src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
\`\`\`

\`\`\`tsx:src/App.tsx
export default function App() {
  return <div style={{ color: 'red' }}>App</div>;
}
\`\`\`
`),
      };

      const generator = new AIGenerator({
        aiClient: mockAIClient,
        validateCode: true,
      });

      const result = await generator.generate({
        description: 'A landing page',
        config: mockConfig,
      });

      expect(result.validation.errors.length).toBeGreaterThan(0);
    });

    it('should handle AI client errors', async () => {
      const mockAIClient: AIClient = {
        generate: vi.fn().mockRejectedValue(new Error('API error')),
      };

      const generator = new AIGenerator({
        aiClient: mockAIClient,
      });

      const result = await generator.generate({
        description: 'A landing page',
        config: mockConfig,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
    });

    it('should handle parse errors', async () => {
      const mockAIClient: AIClient = {
        generate: vi.fn().mockResolvedValue('No valid code blocks here'),
      };

      const generator = new AIGenerator({
        aiClient: mockAIClient,
      });

      const result = await generator.generate({
        description: 'A landing page',
        config: mockConfig,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('parse');
    });
  });

  describe('setAIClient', () => {
    it('should set AI client after construction', async () => {
      const generator = new AIGenerator({ validateCode: false });

      const mockAIClient: AIClient = {
        generate: vi.fn().mockResolvedValue(`
\`\`\`tsx:src/main.tsx
export default function Main() {}
\`\`\`

\`\`\`tsx:src/App.tsx
export default function App() {}
\`\`\`
`),
      };

      generator.setAIClient(mockAIClient);

      await generator.generate({
        description: 'Test',
        config: mockConfig,
      });

      expect(mockAIClient.generate).toHaveBeenCalled();
    });
  });

  describe('validateExistingCode', () => {
    it('should validate provided files', () => {
      const generator = new AIGenerator();

      const result = generator.validateExistingCode([
        {
          path: 'src/main.tsx',
          content: 'export default function Main() {}',
          language: 'tsx',
        },
        {
          path: 'src/App.tsx',
          content: 'export default function App() {}',
          language: 'tsx',
        },
      ]);

      expect(result.success).toBe(true);
    });
  });

  describe('parseResponse', () => {
    it('should parse AI response', () => {
      const generator = new AIGenerator();

      const files = generator.parseResponse(`
\`\`\`tsx:src/App.tsx
export default function App() {}
\`\`\`
`);

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('src/App.tsx');
    });
  });
});

describe('createAIGenerator', () => {
  it('should create new generator instance', () => {
    const generator = createAIGenerator();

    expect(generator).toBeInstanceOf(AIGenerator);
  });

  it('should pass options to generator', () => {
    const generator = createAIGenerator({ useJsxTagger: false });

    const files = generator.generateScaffoldOnly({
      projectId: 'test',
      projectName: 'Test',
      description: 'Test',
    });

    const viteConfig = files.find(f => f.path === 'vite.config.ts');
    expect(viteConfig!.content).not.toContain('jsxTaggerPlugin');
  });
});

describe('aiGenerator singleton', () => {
  it('should be an AIGenerator instance', () => {
    expect(aiGenerator).toBeInstanceOf(AIGenerator);
  });
});
