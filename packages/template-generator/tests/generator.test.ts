import { describe, it, expect } from 'vitest';
import { generateProject, generateComponent } from '../src/index';

describe('Template Generator', () => {
  describe('generateProject', () => {
    it('应该生成完整的项目结构', async () => {
      const project = await generateProject({
        projectId: 'test-project',
        projectName: 'Test Project',
      });

      expect(project.projectId).toBe('test-project');
      expect(project.projectName).toBe('Test Project');
      expect(project.entryPoint).toBe('src/main.tsx');
      expect(project.files.length).toBeGreaterThan(0);
    });

    it('应该包含所有必需的配置文件', async () => {
      const project = await generateProject({
        projectId: 'test',
        projectName: 'Test',
      });

      const filePaths = project.files.map(f => f.path);

      expect(filePaths).toContain('package.json');
      expect(filePaths).toContain('vite.config.ts');
      expect(filePaths).toContain('tailwind.config.js');
      expect(filePaths).toContain('tsconfig.json');
      expect(filePaths).toContain('index.html');
    });

    it('应该包含所有源代码文件', async () => {
      const project = await generateProject({
        projectId: 'test',
        projectName: 'Test',
      });

      const filePaths = project.files.map(f => f.path);

      expect(filePaths).toContain('src/main.tsx');
      expect(filePaths).toContain('src/App.tsx');
      expect(filePaths).toContain('src/styles/globals.css');
      expect(filePaths).toContain('src/lib/utils.ts');
    });

    it('应该包含所有组件文件', async () => {
      const project = await generateProject({
        projectId: 'test',
        projectName: 'Test',
      });

      const filePaths = project.files.map(f => f.path);

      // Layout components
      expect(filePaths).toContain('src/components/layout/Header.tsx');
      expect(filePaths).toContain('src/components/layout/Footer.tsx');

      // UI components
      expect(filePaths).toContain('src/components/ui/Button.tsx');
      expect(filePaths).toContain('src/components/ui/Card.tsx');
      expect(filePaths).toContain('src/components/ui/Input.tsx');

      // Section components
      expect(filePaths).toContain('src/components/sections/Hero.tsx');
      expect(filePaths).toContain('src/components/sections/Features.tsx');
      expect(filePaths).toContain('src/components/sections/CTA.tsx');
    });

    it('应该正确替换模板变量', async () => {
      const project = await generateProject({
        projectId: 'my-awesome-project',
        projectName: 'My Awesome Project',
        description: 'A custom description',
      });

      const packageJson = project.files.find(f => f.path === 'package.json');
      expect(packageJson?.content).toContain('"name": "My Awesome Project"');

      const viteConfig = project.files.find(f => f.path === 'vite.config.ts');
      expect(viteConfig?.content).toContain("idPrefix: 'my-awesome-project'");

      const indexHtml = project.files.find(f => f.path === 'index.html');
      expect(indexHtml?.content).toContain('<title>My Awesome Project</title>');
    });

    it('应该支持自定义主题', async () => {
      const project = await generateProject({
        projectId: 'test',
        projectName: 'Test',
        theme: {
          primaryColor: '#ff6600',
          fontFamily: 'Roboto',
        },
      });

      const tailwindConfig = project.files.find(f => f.path === 'tailwind.config.js');
      expect(tailwindConfig?.content).toContain('#ff6600');
      expect(tailwindConfig?.content).toContain('Roboto');

      const indexHtml = project.files.find(f => f.path === 'index.html');
      expect(indexHtml?.content).toContain('family=Roboto');
    });

    it('应该为每个文件设置正确的类型', async () => {
      const project = await generateProject({
        projectId: 'test',
        projectName: 'Test',
      });

      const packageJson = project.files.find(f => f.path === 'package.json');
      expect(packageJson?.type).toBe('json');

      const mainTsx = project.files.find(f => f.path === 'src/main.tsx');
      expect(mainTsx?.type).toBe('tsx');

      const globalsCss = project.files.find(f => f.path === 'src/styles/globals.css');
      expect(globalsCss?.type).toBe('css');
    });
  });

  describe('generateComponent', () => {
    it('应该生成 Header 组件', () => {
      const code = generateComponent('header', {}, 'Test App');
      expect(code).toContain('function Header');
      expect(code).toContain('Test App');
    });

    it('应该生成 Hero 组件', () => {
      const code = generateComponent('hero', {
        title: 'Custom Title',
        subtitle: 'Custom Subtitle',
      }, 'Test App');
      expect(code).toContain('function Hero');
      expect(code).toContain('Custom Title');
    });

    it('应该为未知组件类型抛出错误', () => {
      expect(() => generateComponent('unknown' as any)).toThrow('Unknown component type');
    });
  });
});
