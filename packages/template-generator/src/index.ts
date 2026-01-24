import type {
  ProjectConfig,
  GeneratedProject,
  GeneratedFile,
  TemplateVariables,
  ComponentConfig,
} from './types';

import {
  packageJsonTemplate,
  viteConfigTemplate,
  tailwindConfigTemplate,
  postcssConfigTemplate,
  tsconfigTemplate,
  tsconfigNodeTemplate,
  eslintConfigTemplate,
  prettierConfigTemplate,
  gitignoreTemplate,
  indexHtmlTemplate,
  faviconSvgTemplate,
} from './templates/config';

import {
  mainTsxTemplate,
  appTsxTemplate,
  viteEnvTemplate,
  globalsCssTemplate,
  utilsTsTemplate,
  useMediaQueryTemplate,
} from './templates/source';

import {
  headerTemplate,
  footerTemplate,
  heroTemplate,
  featuresTemplate,
  ctaTemplate,
  buttonTemplate,
  cardTemplate,
  inputTemplate,
  containerTemplate,
} from './templates/components';

// Re-export types
export type {
  ProjectConfig,
  GeneratedProject,
  GeneratedFile,
  TemplateVariables,
  ComponentConfig,
} from './types';

/**
 * 替换模板中的变量
 */
function replaceTemplateVariables(template: string, variables: TemplateVariables): string {
  let result = template;

  // 替换所有 {{variable}} 形式的占位符
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }

  return result;
}

/**
 * 获取项目名称首字母
 */
function getInitial(projectName: string): string {
  return projectName.charAt(0).toUpperCase();
}

/**
 * 默认主题配置
 */
const DEFAULT_PRIMARY_COLOR = '#0ea5e9';
const DEFAULT_FONT_FAMILY = 'Inter';

/**
 * 生成项目模板
 */
export async function generateProject(config: ProjectConfig): Promise<GeneratedProject> {
  const {
    projectId,
    projectName,
    description = 'Build something amazing with our powerful tools and services.',
    theme = {},
  } = config;

  const primaryColor = theme.primaryColor || DEFAULT_PRIMARY_COLOR;
  const fontFamily = theme.fontFamily || DEFAULT_FONT_FAMILY;

  const variables: TemplateVariables = {
    projectId,
    projectName,
    description,
    primaryColor,
    fontFamily,
  };

  // 扩展变量
  const extendedVariables = {
    ...variables,
    initial: getInitial(projectName),
    title: `Welcome to ${projectName}`,
    subtitle: description,
  };

  const files: GeneratedFile[] = [];

  // 配置文件
  files.push({
    path: 'package.json',
    content: replaceTemplateVariables(packageJsonTemplate, variables),
    type: 'json',
  });

  files.push({
    path: 'vite.config.ts',
    content: replaceTemplateVariables(viteConfigTemplate, variables),
    type: 'config',
  });

  files.push({
    path: 'tailwind.config.js',
    content: replaceTemplateVariables(tailwindConfigTemplate, variables),
    type: 'config',
  });

  files.push({
    path: 'postcss.config.js',
    content: postcssConfigTemplate,
    type: 'config',
  });

  files.push({
    path: 'tsconfig.json',
    content: tsconfigTemplate,
    type: 'json',
  });

  files.push({
    path: 'tsconfig.node.json',
    content: tsconfigNodeTemplate,
    type: 'json',
  });

  files.push({
    path: '.eslintrc.cjs',
    content: eslintConfigTemplate,
    type: 'config',
  });

  files.push({
    path: '.prettierrc',
    content: prettierConfigTemplate,
    type: 'json',
  });

  files.push({
    path: '.gitignore',
    content: gitignoreTemplate,
    type: 'config',
  });

  files.push({
    path: 'index.html',
    content: replaceTemplateVariables(indexHtmlTemplate, variables),
    type: 'html',
  });

  files.push({
    path: 'public/favicon.svg',
    content: replaceTemplateVariables(faviconSvgTemplate, variables),
    type: 'svg',
  });

  // 源代码文件
  files.push({
    path: 'src/main.tsx',
    content: mainTsxTemplate,
    type: 'tsx',
  });

  files.push({
    path: 'src/App.tsx',
    content: appTsxTemplate,
    type: 'tsx',
  });

  files.push({
    path: 'src/vite-env.d.ts',
    content: viteEnvTemplate,
    type: 'ts',
  });

  files.push({
    path: 'src/styles/globals.css',
    content: globalsCssTemplate,
    type: 'css',
  });

  files.push({
    path: 'src/lib/utils.ts',
    content: utilsTsTemplate,
    type: 'ts',
  });

  files.push({
    path: 'src/hooks/useMediaQuery.ts',
    content: useMediaQueryTemplate,
    type: 'ts',
  });

  // 布局组件
  files.push({
    path: 'src/components/layout/Header.tsx',
    content: replaceTemplateVariables(headerTemplate, extendedVariables as TemplateVariables),
    type: 'tsx',
  });

  files.push({
    path: 'src/components/layout/Footer.tsx',
    content: replaceTemplateVariables(footerTemplate, extendedVariables as TemplateVariables),
    type: 'tsx',
  });

  files.push({
    path: 'src/components/layout/Container.tsx',
    content: containerTemplate,
    type: 'tsx',
  });

  // UI 组件
  files.push({
    path: 'src/components/ui/Button.tsx',
    content: buttonTemplate,
    type: 'tsx',
  });

  files.push({
    path: 'src/components/ui/Card.tsx',
    content: cardTemplate,
    type: 'tsx',
  });

  files.push({
    path: 'src/components/ui/Input.tsx',
    content: inputTemplate,
    type: 'tsx',
  });

  // Section 组件
  files.push({
    path: 'src/components/sections/Hero.tsx',
    content: replaceTemplateVariables(heroTemplate, extendedVariables as TemplateVariables),
    type: 'tsx',
  });

  files.push({
    path: 'src/components/sections/Features.tsx',
    content: featuresTemplate,
    type: 'tsx',
  });

  files.push({
    path: 'src/components/sections/CTA.tsx',
    content: ctaTemplate,
    type: 'tsx',
  });

  return {
    projectId,
    projectName,
    files,
    entryPoint: 'src/main.tsx',
  };
}

/**
 * 生成单个组件
 */
export function generateComponent(
  type: ComponentConfig['type'],
  props: Record<string, unknown> = {},
  projectName: string = 'MyProject'
): string {
  const variables = {
    projectId: 'project',
    projectName,
    description: (props.description as string) || 'Project description',
    primaryColor: '#0ea5e9',
    fontFamily: 'Inter',
    initial: getInitial(projectName),
    title: (props.title as string) || `Welcome to ${projectName}`,
    subtitle: (props.subtitle as string) || 'Build something amazing.',
  };

  switch (type) {
    case 'header':
      return replaceTemplateVariables(headerTemplate, variables as TemplateVariables);
    case 'footer':
      return replaceTemplateVariables(footerTemplate, variables as TemplateVariables);
    case 'hero':
      return replaceTemplateVariables(heroTemplate, variables as TemplateVariables);
    case 'features':
      return featuresTemplate;
    case 'cta':
      return ctaTemplate;
    default:
      throw new Error(`Unknown component type: ${type}`);
  }
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(type: GeneratedFile['type']): string {
  switch (type) {
    case 'tsx':
      return '.tsx';
    case 'ts':
      return '.ts';
    case 'json':
      return '.json';
    case 'css':
      return '.css';
    case 'html':
      return '.html';
    case 'svg':
      return '.svg';
    case 'config':
      return '';
    default:
      return '';
  }
}

export default generateProject;
