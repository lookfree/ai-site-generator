/**
 * 项目配置
 */
export interface ProjectConfig {
  /** 项目唯一标识 */
  projectId: string;
  /** 项目名称 */
  projectName: string;
  /** 项目描述 */
  description?: string;
  /** 组件配置列表 */
  components?: ComponentConfig[];
  /** 主题配置 */
  theme?: ThemeConfig;
}

/**
 * 组件配置
 */
export interface ComponentConfig {
  /** 组件名称 */
  name: string;
  /** 组件类型 */
  type: 'header' | 'hero' | 'features' | 'cta' | 'footer' | 'custom';
  /** 组件属性 */
  props?: Record<string, unknown>;
  /** 自定义组件代码 (仅当 type 为 'custom' 时使用) */
  code?: string;
}

/**
 * 主题配置
 */
export interface ThemeConfig {
  /** 主色调 */
  primaryColor?: string;
  /** 字体系列 */
  fontFamily?: string;
  /** 圆角大小 */
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

/**
 * 生成的项目
 */
export interface GeneratedProject {
  /** 项目 ID */
  projectId: string;
  /** 项目名称 */
  projectName: string;
  /** 生成的文件列表 */
  files: GeneratedFile[];
  /** 入口文件路径 */
  entryPoint: string;
}

/**
 * 生成的文件
 */
export interface GeneratedFile {
  /** 文件相对路径 */
  path: string;
  /** 文件内容 */
  content: string;
  /** 文件类型 */
  type: 'tsx' | 'ts' | 'json' | 'css' | 'html' | 'config' | 'svg';
}

/**
 * 模板变量
 */
export interface TemplateVariables {
  projectId: string;
  projectName: string;
  description: string;
  primaryColor: string;
  fontFamily: string;
}
