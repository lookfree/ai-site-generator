/**
 * SWC WASM 封装模块
 * 提供代码解析和生成功能
 *
 * 支持两种运行环境：
 * - 浏览器：使用 @swc/wasm-web
 * - Node.js：使用 @swc/core (用于测试)
 */

// SWC WASM 模块类型
interface SwcModule {
  parseSync: (code: string, options: SwcParseOptions) => unknown;
  printSync: (ast: unknown, options: SwcPrintOptions) => { code: string };
}

interface SwcParseOptions {
  syntax: 'typescript' | 'ecmascript';
  tsx?: boolean;
  jsx?: boolean;
  decorators?: boolean;
  dynamicImport?: boolean;
}

interface SwcPrintOptions {
  minify?: boolean;
  isModule?: boolean;
}

// 模块状态
let swcModule: SwcModule | null = null;
let initialized = false;
let initPromise: Promise<void> | null = null;

/**
 * 检测是否在 Node.js 环境
 */
function isNodeEnvironment(): boolean {
  return typeof process !== 'undefined' && process.versions?.node !== undefined;
}

/**
 * 初始化 SWC WASM 模块
 * 支持并发调用，只初始化一次
 */
export async function initSWC(): Promise<void> {
  if (initialized && swcModule) return;

  if (!initPromise) {
    initPromise = (async () => {
      try {
        if (isNodeEnvironment()) {
          // Node.js 环境：尝试使用 @swc/core
          try {
            const swcCore = await import('@swc/core');
            swcModule = {
              parseSync: (code: string, options: SwcParseOptions) => {
                return swcCore.parseSync(code, {
                  syntax: options.syntax,
                  tsx: options.tsx,
                  decorators: options.decorators,
                  dynamicImport: options.dynamicImport,
                });
              },
              printSync: (ast: unknown, options: SwcPrintOptions) => {
                return swcCore.printSync(ast as any, {
                  minify: options.minify,
                  isModule: options.isModule,
                });
              },
            };
            initialized = true;
            return;
          } catch {
            // @swc/core 不可用，继续尝试 @swc/wasm-web
          }
        }

        // 浏览器环境：使用 @swc/wasm-web
        const swc = await import('@swc/wasm-web');
        await swc.default();
        swcModule = swc as unknown as SwcModule;
        initialized = true;
      } catch (error) {
        initPromise = null;
        throw new Error(`Failed to initialize SWC WASM: ${error}`);
      }
    })();
  }

  await initPromise;
}

/**
 * 检查是否已初始化
 */
export function isInitialized(): boolean {
  return initialized;
}

/**
 * 解析配置
 */
export interface ParseOptions {
  syntax: 'typescript' | 'ecmascript';
  tsx?: boolean;
  jsx?: boolean;
  decorators?: boolean;
  dynamicImport?: boolean;
}

const DEFAULT_PARSE_OPTIONS: ParseOptions = {
  syntax: 'typescript',
  tsx: true,
  decorators: true,
  dynamicImport: true,
};

/**
 * 解析代码为 AST
 */
export async function parse(
  code: string,
  options: Partial<ParseOptions> = {}
): Promise<unknown> {
  await initSWC();

  if (!swcModule) {
    throw new Error('SWC module not initialized');
  }

  const mergedOptions = { ...DEFAULT_PARSE_OPTIONS, ...options };

  return swcModule.parseSync(code, {
    syntax: mergedOptions.syntax,
    tsx: mergedOptions.tsx,
    decorators: mergedOptions.decorators,
    dynamicImport: mergedOptions.dynamicImport,
  });
}

/**
 * 打印配置
 */
export interface PrintOptions {
  minify?: boolean;
  isModule?: boolean;
}

const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  minify: false,
  isModule: true,
};

/**
 * 将 AST 打印为代码
 */
export async function print(
  ast: unknown,
  options: Partial<PrintOptions> = {}
): Promise<string> {
  await initSWC();

  if (!swcModule) {
    throw new Error('SWC module not initialized');
  }

  const mergedOptions = { ...DEFAULT_PRINT_OPTIONS, ...options };

  const result = swcModule.printSync(ast, mergedOptions);
  return result.code;
}

/**
 * 重置模块状态 (用于测试)
 */
export function resetSWC(): void {
  swcModule = null;
  initialized = false;
  initPromise = null;
}
