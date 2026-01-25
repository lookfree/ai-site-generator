/**
 * Prompt 服务测试
 */

import { describe, it, expect } from 'vitest';
import {
  REACT_SYSTEM_PROMPT,
  REACT_SYSTEM_PROMPT_EN,
  getSystemPrompt,
  createUserPrompt,
} from '../../src/services/prompt';

describe('REACT_SYSTEM_PROMPT', () => {
  it('should contain React requirements', () => {
    expect(REACT_SYSTEM_PROMPT).toContain('React');
    expect(REACT_SYSTEM_PROMPT).toContain('TypeScript');
    expect(REACT_SYSTEM_PROMPT).toContain('Tailwind CSS');
  });

  it('should contain component rules', () => {
    expect(REACT_SYSTEM_PROMPT).toContain('export default');
    expect(REACT_SYSTEM_PROMPT).toContain('interface');
  });

  it('should contain file structure', () => {
    expect(REACT_SYSTEM_PROMPT).toContain('src/main.tsx');
    expect(REACT_SYSTEM_PROMPT).toContain('src/App.tsx');
    expect(REACT_SYSTEM_PROMPT).toContain('components/');
  });

  it('should contain output format', () => {
    expect(REACT_SYSTEM_PROMPT).toContain('```tsx:');
  });
});

describe('REACT_SYSTEM_PROMPT_EN', () => {
  it('should be in English', () => {
    expect(REACT_SYSTEM_PROMPT_EN).toContain('professional');
    expect(REACT_SYSTEM_PROMPT_EN).toContain('React');
    expect(REACT_SYSTEM_PROMPT_EN).not.toContain('中文');
  });

  it('should have similar structure as Chinese version', () => {
    expect(REACT_SYSTEM_PROMPT_EN).toContain('React');
    expect(REACT_SYSTEM_PROMPT_EN).toContain('TypeScript');
    expect(REACT_SYSTEM_PROMPT_EN).toContain('Tailwind CSS');
    expect(REACT_SYSTEM_PROMPT_EN).toContain('export default');
  });
});

describe('getSystemPrompt', () => {
  it('should return Chinese prompt by default', () => {
    const prompt = getSystemPrompt();

    expect(prompt).toBe(REACT_SYSTEM_PROMPT);
  });

  it('should return Chinese prompt for zh', () => {
    const prompt = getSystemPrompt('zh');

    expect(prompt).toBe(REACT_SYSTEM_PROMPT);
  });

  it('should return English prompt for en', () => {
    const prompt = getSystemPrompt('en');

    expect(prompt).toBe(REACT_SYSTEM_PROMPT_EN);
  });
});

describe('createUserPrompt', () => {
  it('should include description', () => {
    const prompt = createUserPrompt('A landing page for my SaaS');

    expect(prompt).toContain('A landing page for my SaaS');
  });

  it('should include primary color when provided', () => {
    const prompt = createUserPrompt('A landing page', {
      primaryColor: '#3b82f6',
    });

    expect(prompt).toContain('#3b82f6');
    expect(prompt).toContain('主题色');
  });

  it('should include examples request when enabled', () => {
    const prompt = createUserPrompt('A landing page', {
      includeExamples: true,
    });

    expect(prompt).toContain('交互示例');
  });

  it('should work with all options', () => {
    const prompt = createUserPrompt('A landing page', {
      primaryColor: '#ff0000',
      includeExamples: true,
    });

    expect(prompt).toContain('A landing page');
    expect(prompt).toContain('#ff0000');
    expect(prompt).toContain('交互示例');
  });

  it('should work without options', () => {
    const prompt = createUserPrompt('A simple page');

    expect(prompt).toContain('A simple page');
    expect(prompt).not.toContain('主题色');
    expect(prompt).not.toContain('交互示例');
  });
});
