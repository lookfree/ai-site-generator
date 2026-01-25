/**
 * TypeScript 类型检查器
 * 对生成的代码进行 TypeScript 类型检查
 */

import ts from 'typescript';
import type { TypeCheckResult, TypeCheckError, TypeCheckWarning } from '../types';

/** 默认编译选项 */
const DEFAULT_COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  strict: true,
  noEmit: true,
  skipLibCheck: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  resolveJsonModule: true,
  isolatedModules: true,
};

/** React 类型声明 (简化版) */
const REACT_TYPES = `
declare module 'react' {
  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
  export function useMemo<T>(factory: () => T, deps: readonly any[]): T;
  export function useRef<T>(initialValue: T): { current: T };
  export function useContext<T>(context: React.Context<T>): T;
  export function useReducer<R extends React.Reducer<any, any>>(reducer: R, initialState: React.ReducerState<R>): [React.ReducerState<R>, React.Dispatch<React.ReducerAction<R>>];

  export type FC<P = {}> = (props: P) => JSX.Element | null;
  export type ReactNode = JSX.Element | string | number | boolean | null | undefined | ReactNode[];
  export type ReactElement = JSX.Element;
  export type Context<T> = { Provider: FC<{ value: T; children?: ReactNode }>; Consumer: FC<{ children: (value: T) => ReactNode }> };
  export type Reducer<S, A> = (prevState: S, action: A) => S;
  export type ReducerState<R extends Reducer<any, any>> = R extends Reducer<infer S, any> ? S : never;
  export type ReducerAction<R extends Reducer<any, any>> = R extends Reducer<any, infer A> ? A : never;
  export type Dispatch<A> = (action: A) => void;

  export default {
    createElement: (type: any, props?: any, ...children: any[]) => JSX.Element,
    Fragment: Symbol(),
    StrictMode: FC<{ children?: ReactNode }>,
  };
}

declare module 'react-dom/client' {
  export function createRoot(container: Element | DocumentFragment): {
    render(element: JSX.Element): void;
    unmount(): void;
  };
}

declare namespace JSX {
  interface Element {}
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
`;

/**
 * 对生成的代码进行 TypeScript 类型检查
 */
export function typeCheck(files: Map<string, string>, options?: Partial<ts.CompilerOptions>): TypeCheckResult {
  const errors: TypeCheckError[] = [];
  const warnings: TypeCheckWarning[] = [];

  const compilerOptions = { ...DEFAULT_COMPILER_OPTIONS, ...options };

  // 添加 React 类型声明
  const allFiles = new Map(files);
  allFiles.set('node_modules/@types/react/index.d.ts', REACT_TYPES);

  // 创建虚拟编译主机
  const host = createVirtualCompilerHost(allFiles, compilerOptions);

  // 创建程序
  const program = ts.createProgram(
    Array.from(files.keys()),
    compilerOptions,
    host
  );

  // 获取诊断信息
  const diagnostics = [
    ...program.getSyntacticDiagnostics(),
    ...program.getSemanticDiagnostics(),
  ];

  for (const diagnostic of diagnostics) {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

    if (diagnostic.file && diagnostic.start !== undefined) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start
      );

      if (diagnostic.category === ts.DiagnosticCategory.Error) {
        errors.push({
          file: diagnostic.file.fileName,
          line: line + 1,
          column: character + 1,
          message,
          code: diagnostic.code,
        });
      } else if (diagnostic.category === ts.DiagnosticCategory.Warning) {
        warnings.push({
          file: diagnostic.file.fileName,
          line: line + 1,
          message,
        });
      }
    }
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 快速语法检查 (不进行完整类型检查)
 */
export function syntaxCheck(files: Map<string, string>): TypeCheckResult {
  const errors: TypeCheckError[] = [];
  const warnings: TypeCheckWarning[] = [];

  for (const [fileName, content] of files) {
    // 只检查 TS/TSX 文件
    if (!fileName.endsWith('.ts') && !fileName.endsWith('.tsx')) {
      continue;
    }

    const sourceFile = ts.createSourceFile(
      fileName,
      content,
      ts.ScriptTarget.ES2020,
      true,
      fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    // 使用 ts.getPreEmitDiagnostics 的简化替代方案
    // 通过创建一个最小程序来获取语法诊断
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      jsx: fileName.endsWith('.tsx') ? ts.JsxEmit.ReactJSX : undefined,
      noEmit: true,
      skipLibCheck: true,
    };

    const host: ts.CompilerHost = {
      getSourceFile: (name) => name === fileName ? sourceFile : undefined,
      getDefaultLibFileName: () => 'lib.d.ts',
      writeFile: () => {},
      getCurrentDirectory: () => '/',
      getCanonicalFileName: (f) => f,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: (f) => f === fileName,
      readFile: () => undefined,
    };

    const program = ts.createProgram([fileName], compilerOptions, host);
    const syntaxDiagnostics = program.getSyntacticDiagnostics(sourceFile);

    for (const diagnostic of syntaxDiagnostics) {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

      if (diagnostic.start !== undefined) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(
          diagnostic.start
        );

        errors.push({
          file: fileName,
          line: line + 1,
          column: character + 1,
          message,
          code: diagnostic.code,
        });
      }
    }
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 创建虚拟编译主机
 */
function createVirtualCompilerHost(
  files: Map<string, string>,
  options: ts.CompilerOptions
): ts.CompilerHost {
  const defaultLibFileName = ts.getDefaultLibFileName(options);

  return {
    getSourceFile: (fileName, languageVersion) => {
      const content = files.get(fileName);
      if (content !== undefined) {
        return ts.createSourceFile(
          fileName,
          content,
          languageVersion,
          true,
          getScriptKind(fileName)
        );
      }
      return undefined;
    },
    getDefaultLibFileName: () => defaultLibFileName,
    writeFile: () => {},
    getCurrentDirectory: () => '/',
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (fileName) => files.has(fileName),
    readFile: (fileName) => files.get(fileName),
    directoryExists: () => true,
    getDirectories: () => [],
  };
}

/**
 * 获取脚本类型
 */
function getScriptKind(fileName: string): ts.ScriptKind {
  if (fileName.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (fileName.endsWith('.ts')) return ts.ScriptKind.TS;
  if (fileName.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (fileName.endsWith('.js')) return ts.ScriptKind.JS;
  if (fileName.endsWith('.json')) return ts.ScriptKind.JSON;
  return ts.ScriptKind.Unknown;
}

/**
 * 格式化类型检查错误
 */
export function formatTypeCheckErrors(result: TypeCheckResult): string {
  if (result.success) {
    return 'No errors found.';
  }

  const lines: string[] = [];

  for (const error of result.errors) {
    lines.push(`Error: ${error.file}:${error.line}:${error.column}`);
    lines.push(`  TS${error.code}: ${error.message}`);
    lines.push('');
  }

  for (const warning of result.warnings) {
    lines.push(`Warning: ${warning.file}:${warning.line}`);
    lines.push(`  ${warning.message}`);
    lines.push('');
  }

  return lines.join('\n');
}
