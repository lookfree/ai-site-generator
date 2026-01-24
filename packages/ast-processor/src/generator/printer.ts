/**
 * 代码打印器
 * 提供 AST 到代码的格式化输出功能
 */

export interface PrinterOptions {
  /** 缩进字符串 (默认 2 空格) */
  indent?: string;
  /** 是否使用分号 */
  semicolons?: boolean;
  /** 是否使用单引号 */
  singleQuote?: boolean;
  /** 行宽限制 */
  printWidth?: number;
  /** JSX 属性是否换行 */
  jsxBracketSameLine?: boolean;
}

const DEFAULT_OPTIONS: Required<PrinterOptions> = {
  indent: '  ',
  semicolons: true,
  singleQuote: true,
  printWidth: 80,
  jsxBracketSameLine: false,
};

/**
 * 代码打印器类
 * 用于将 AST 节点转换为格式化的代码字符串
 */
export class Printer {
  private options: Required<PrinterOptions>;
  private depth: number = 0;

  constructor(options: PrinterOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 打印 AST 节点
   */
  print(node: unknown): string {
    if (!node || typeof node !== 'object') {
      return String(node);
    }

    const nodeObj = node as Record<string, unknown>;
    const type = nodeObj.type as string;

    switch (type) {
      case 'Module':
        return this.printModule(nodeObj);
      case 'ExportDefaultDeclaration':
        return this.printExportDefault(nodeObj);
      case 'FunctionDeclaration':
        return this.printFunctionDeclaration(nodeObj);
      case 'ArrowFunctionExpression':
        return this.printArrowFunction(nodeObj);
      case 'ReturnStatement':
        return this.printReturnStatement(nodeObj);
      case 'JSXElement':
        return this.printJSXElement(nodeObj);
      case 'JSXFragment':
        return this.printJSXFragment(nodeObj);
      case 'JSXText':
        return this.printJSXText(nodeObj);
      case 'JSXExpressionContainer':
        return this.printJSXExpressionContainer(nodeObj);
      case 'StringLiteral':
        return this.printStringLiteral(nodeObj);
      case 'Identifier':
        return nodeObj.value as string;
      default:
        return this.printGeneric(nodeObj);
    }
  }

  private printModule(node: Record<string, unknown>): string {
    const body = node.body as unknown[];
    return body.map(item => this.print(item)).join('\n\n');
  }

  private printExportDefault(node: Record<string, unknown>): string {
    const declaration = this.print(node.declaration || node.decl);
    return `export default ${declaration}`;
  }

  private printFunctionDeclaration(node: Record<string, unknown>): string {
    const identifier = node.identifier as Record<string, unknown>;
    const name = identifier?.value || 'anonymous';
    const params = node.params as unknown[];
    const body = node.body as Record<string, unknown>;

    const paramStr = params ? params.map(p => this.print(p)).join(', ') : '';
    const bodyStr = this.printBlockStatement(body);

    return `function ${name}(${paramStr}) ${bodyStr}`;
  }

  private printArrowFunction(node: Record<string, unknown>): string {
    const params = node.params as unknown[];
    const body = node.body;

    const paramStr = params ? params.map(p => this.print(p)).join(', ') : '';
    const bodyStr = this.print(body);

    if ((body as Record<string, unknown>)?.type === 'BlockStatement') {
      return `(${paramStr}) => ${bodyStr}`;
    }

    return `(${paramStr}) => ${bodyStr}`;
  }

  private printBlockStatement(node: Record<string, unknown>): string {
    const stmts = (node.stmts || node.body) as unknown[];
    if (!stmts || stmts.length === 0) {
      return '{}';
    }

    this.depth++;
    const indent = this.getIndent();
    const content = stmts.map(stmt => `${indent}${this.print(stmt)}`).join('\n');
    this.depth--;

    return `{\n${content}\n${this.getIndent()}}`;
  }

  private printReturnStatement(node: Record<string, unknown>): string {
    const argument = node.argument;
    if (!argument) {
      return `return${this.options.semicolons ? ';' : ''}`;
    }

    const argStr = this.print(argument);

    // JSX 通常需要括号包裹
    const argObj = argument as Record<string, unknown>;
    if (argObj?.type === 'JSXElement' || argObj?.type === 'JSXFragment') {
      return `return (\n${this.getIndent()}${this.options.indent}${argStr}\n${this.getIndent()})${this.options.semicolons ? ';' : ''}`;
    }

    return `return ${argStr}${this.options.semicolons ? ';' : ''}`;
  }

  private printJSXElement(node: Record<string, unknown>): string {
    const opening = node.opening as Record<string, unknown>;
    const closing = node.closing as Record<string, unknown>;
    const children = node.children as unknown[];

    const openingStr = this.printJSXOpeningElement(opening);

    if (opening.selfClosing) {
      return openingStr;
    }

    const closingStr = closing ? this.printJSXClosingElement(closing) : '';

    if (!children || children.length === 0) {
      return `${openingStr}${closingStr}`;
    }

    // 单个文本子节点，内联显示
    if (children.length === 1 && (children[0] as Record<string, unknown>)?.type === 'JSXText') {
      const text = this.printJSXText(children[0] as Record<string, unknown>);
      return `${openingStr}${text}${closingStr}`;
    }

    // 多个子节点，换行显示
    this.depth++;
    const childrenStr = children.map(child => {
      const childStr = this.print(child);
      if ((child as Record<string, unknown>)?.type === 'JSXText') {
        return childStr.trim() ? `${this.getIndent()}${childStr.trim()}` : '';
      }
      return `${this.getIndent()}${childStr}`;
    }).filter(Boolean).join('\n');
    this.depth--;

    return `${openingStr}\n${childrenStr}\n${this.getIndent()}${closingStr}`;
  }

  private printJSXOpeningElement(node: Record<string, unknown>): string {
    const name = this.printJSXElementName(node.name);
    const attributes = node.attributes as unknown[];
    const selfClosing = node.selfClosing;

    if (!attributes || attributes.length === 0) {
      return selfClosing ? `<${name} />` : `<${name}>`;
    }

    const attrStr = attributes.map(attr => this.printJSXAttribute(attr as Record<string, unknown>)).join(' ');

    if (selfClosing) {
      return `<${name} ${attrStr} />`;
    }

    return `<${name} ${attrStr}>`;
  }

  private printJSXClosingElement(node: Record<string, unknown>): string {
    const name = this.printJSXElementName(node.name);
    return `</${name}>`;
  }

  private printJSXElementName(name: unknown): string {
    if (!name || typeof name !== 'object') {
      return String(name);
    }

    const nameObj = name as Record<string, unknown>;

    if (nameObj.type === 'Identifier') {
      return nameObj.value as string;
    }

    if (nameObj.type === 'JSXMemberExpression') {
      const object = this.printJSXElementName(nameObj.object);
      const property = (nameObj.property as Record<string, unknown>)?.value;
      return `${object}.${property}`;
    }

    return 'unknown';
  }

  private printJSXAttribute(attr: Record<string, unknown>): string {
    if (attr.type === 'JSXSpreadAttribute') {
      const argument = this.print(attr.argument);
      return `{...${argument}}`;
    }

    const name = (attr.name as Record<string, unknown>)?.value;
    const value = attr.value;

    if (!value) {
      // 布尔属性
      return String(name);
    }

    const valueObj = value as Record<string, unknown>;

    if (valueObj.type === 'StringLiteral') {
      const quote = this.options.singleQuote ? "'" : '"';
      return `${name}=${quote}${valueObj.value}${quote}`;
    }

    if (valueObj.type === 'JSXExpressionContainer') {
      return `${name}={${this.print(valueObj.expression)}}`;
    }

    return `${name}={${this.print(value)}}`;
  }

  private printJSXFragment(node: Record<string, unknown>): string {
    const children = node.children as unknown[];

    if (!children || children.length === 0) {
      return '<></>';
    }

    this.depth++;
    const childrenStr = children.map(child => {
      const childStr = this.print(child);
      return `${this.getIndent()}${childStr}`;
    }).join('\n');
    this.depth--;

    return `<>\n${childrenStr}\n${this.getIndent()}</>`;
  }

  private printJSXText(node: Record<string, unknown>): string {
    return (node.value as string) || '';
  }

  private printJSXExpressionContainer(node: Record<string, unknown>): string {
    return `{${this.print(node.expression)}}`;
  }

  private printStringLiteral(node: Record<string, unknown>): string {
    const quote = this.options.singleQuote ? "'" : '"';
    return `${quote}${node.value}${quote}`;
  }

  private printGeneric(node: Record<string, unknown>): string {
    // 通用打印，尝试识别常见模式
    if (node.value !== undefined) {
      if (typeof node.value === 'string') {
        return node.value;
      }
      return String(node.value);
    }

    return JSON.stringify(node);
  }

  private getIndent(): string {
    return this.options.indent.repeat(this.depth);
  }
}

/**
 * 创建打印器实例
 */
export function createPrinter(options?: PrinterOptions): Printer {
  return new Printer(options);
}

/**
 * 快速打印 AST
 */
export function printAST(ast: unknown, options?: PrinterOptions): string {
  const printer = new Printer(options);
  return printer.print(ast);
}
