/**
 * 项目脚手架生成器测试
 */

import { describe, it, expect } from 'vitest';
import {
  generateScaffold,
  generateViteConfigWithTagger,
  generateTailwindConfigWithColor,
  generateDefaultAppTsx,
} from '../../src/services/scaffolder';

describe('generateScaffold', () => {
  const config = {
    projectId: 'test-project-123',
    projectName: 'Test Project',
    description: 'A test project',
  };

  it('should generate all required files', () => {
    const result = generateScaffold(config);

    expect(result.success).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);

    const paths = result.files.map(f => f.path);
    expect(paths).toContain('package.json');
    expect(paths).toContain('vite.config.ts');
    expect(paths).toContain('tsconfig.json');
    expect(paths).toContain('tsconfig.node.json');
    expect(paths).toContain('tailwind.config.js');
    expect(paths).toContain('postcss.config.js');
    expect(paths).toContain('index.html');
    expect(paths).toContain('.eslintrc.cjs');
    expect(paths).toContain('.prettierrc');
    expect(paths).toContain('.gitignore');
    expect(paths).toContain('src/vite-env.d.ts');
    expect(paths).toContain('src/styles/globals.css');
    expect(paths).toContain('src/main.tsx');
  });

  it('should generate valid package.json', () => {
    const result = generateScaffold(config);
    const pkgFile = result.files.find(f => f.path === 'package.json');

    expect(pkgFile).toBeDefined();

    const pkg = JSON.parse(pkgFile!.content);
    expect(pkg.name).toBe('test-project');
    expect(pkg.dependencies.react).toBeDefined();
    expect(pkg.dependencies['react-dom']).toBeDefined();
    expect(pkg.devDependencies.vite).toBeDefined();
    expect(pkg.devDependencies.tailwindcss).toBeDefined();
    expect(pkg.scripts.dev).toBe('vite');
    expect(pkg.scripts.build).toContain('vite build');
  });

  it('should generate valid tsconfig.json', () => {
    const result = generateScaffold(config);
    const tsconfigFile = result.files.find(f => f.path === 'tsconfig.json');

    expect(tsconfigFile).toBeDefined();

    const tsconfig = JSON.parse(tsconfigFile!.content);
    expect(tsconfig.compilerOptions.jsx).toBe('react-jsx');
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.paths['@/*']).toEqual(['./src/*']);
  });

  it('should generate valid tailwind config', () => {
    const result = generateScaffold(config);
    const tailwindFile = result.files.find(f => f.path === 'tailwind.config.js');

    expect(tailwindFile).toBeDefined();
    expect(tailwindFile!.content).toContain('content:');
    expect(tailwindFile!.content).toContain('./src/**/*.{js,ts,jsx,tsx}');
    expect(tailwindFile!.content).toContain('theme:');
  });

  it('should generate index.html with project name', () => {
    const result = generateScaffold(config);
    const htmlFile = result.files.find(f => f.path === 'index.html');

    expect(htmlFile).toBeDefined();
    expect(htmlFile!.content).toContain('<title>Test Project</title>');
    expect(htmlFile!.content).toContain('content="A test project"');
    expect(htmlFile!.content).toContain('/src/main.tsx');
  });

  it('should generate globals.css with Tailwind directives', () => {
    const result = generateScaffold(config);
    const cssFile = result.files.find(f => f.path === 'src/styles/globals.css');

    expect(cssFile).toBeDefined();
    expect(cssFile!.content).toContain('@tailwind base;');
    expect(cssFile!.content).toContain('@tailwind components;');
    expect(cssFile!.content).toContain('@tailwind utilities;');
  });

  it('should generate main.tsx entry point', () => {
    const result = generateScaffold(config);
    const mainFile = result.files.find(f => f.path === 'src/main.tsx');

    expect(mainFile).toBeDefined();
    expect(mainFile!.content).toContain("import React from 'react'");
    expect(mainFile!.content).toContain("import ReactDOM from 'react-dom/client'");
    expect(mainFile!.content).toContain("import App from './App'");
    expect(mainFile!.content).toContain('createRoot');
  });

  it('should escape HTML special characters in index.html', () => {
    const result = generateScaffold({
      ...config,
      projectName: 'Test <Project> & "Stuff"',
    });
    const htmlFile = result.files.find(f => f.path === 'index.html');

    expect(htmlFile).toBeDefined();
    expect(htmlFile!.content).toContain('&lt;Project&gt;');
    expect(htmlFile!.content).toContain('&amp;');
    expect(htmlFile!.content).toContain('&quot;');
  });

  it('should slugify project name in package.json', () => {
    const result = generateScaffold({
      ...config,
      projectName: 'My Cool Project',
    });
    const pkgFile = result.files.find(f => f.path === 'package.json');

    expect(pkgFile).toBeDefined();

    const pkg = JSON.parse(pkgFile!.content);
    expect(pkg.name).toBe('my-cool-project');
  });
});

describe('generateViteConfigWithTagger', () => {
  it('should include jsx-tagger plugin', () => {
    const config = {
      projectId: 'abc12345-def6-7890',
      projectName: 'Test',
      description: 'Test',
    };

    const content = generateViteConfigWithTagger(config);

    expect(content).toContain('jsxTaggerPlugin');
    expect(content).toContain("idPrefix: 'abc12345'");
    expect(content).toContain("import { jsxTaggerPlugin } from 'vite-plugin-jsx-tagger'");
  });
});

describe('generateTailwindConfigWithColor', () => {
  it('should generate color variants', () => {
    const content = generateTailwindConfigWithColor('#3b82f6');

    expect(content).toContain("500: '#3b82f6'");
    expect(content).toContain('primary:');
    // Should have lighter and darker variants
    expect(content).toContain('50:');
    expect(content).toContain('900:');
  });
});

describe('generateDefaultAppTsx', () => {
  it('should generate App with project name', () => {
    const content = generateDefaultAppTsx('My Project');

    expect(content).toContain('export default function App()');
    expect(content).toContain('My Project');
    expect(content).toContain('className=');
  });

  it('should escape HTML in project name', () => {
    const content = generateDefaultAppTsx('<script>alert("xss")</script>');

    expect(content).not.toContain('<script>');
    expect(content).toContain('&lt;script&gt;');
  });
});
