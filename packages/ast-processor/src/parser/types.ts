/**
 * SWC AST 类型定义
 * 基于 @swc/core 的 AST 结构
 */

export interface Span {
  start: number;
  end: number;
}

export interface BaseNode {
  type: string;
  span?: Span;
}

// ============== 模块结构 ==============

export interface Module extends BaseNode {
  type: 'Module';
  body: ModuleItem[];
  interpreter?: string;
}

export type ModuleItem = ModuleDeclaration | Statement;

export type ModuleDeclaration =
  | ImportDeclaration
  | ExportDeclaration
  | ExportDefaultDeclaration
  | ExportAllDeclaration;

// ============== 导入/导出 ==============

export interface ImportDeclaration extends BaseNode {
  type: 'ImportDeclaration';
  specifiers: ImportSpecifier[];
  source: StringLiteral;
}

export interface ImportSpecifier extends BaseNode {
  type: 'ImportSpecifier' | 'ImportDefaultSpecifier' | 'ImportNamespaceSpecifier';
  local: Identifier;
  imported?: Identifier;
}

export interface ExportDeclaration extends BaseNode {
  type: 'ExportDeclaration';
  declaration: Declaration;
}

export interface ExportDefaultDeclaration extends BaseNode {
  type: 'ExportDefaultDeclaration';
  declaration: Expression | Declaration;
}

export interface ExportAllDeclaration extends BaseNode {
  type: 'ExportAllDeclaration';
  source: StringLiteral;
}

// ============== 语句 ==============

export type Statement =
  | BlockStatement
  | ExpressionStatement
  | ReturnStatement
  | IfStatement
  | VariableDeclaration
  | FunctionDeclaration;

export interface BlockStatement extends BaseNode {
  type: 'BlockStatement';
  stmts: Statement[];
}

export interface ExpressionStatement extends BaseNode {
  type: 'ExpressionStatement';
  expression: Expression;
}

export interface ReturnStatement extends BaseNode {
  type: 'ReturnStatement';
  argument?: Expression;
}

export interface IfStatement extends BaseNode {
  type: 'IfStatement';
  test: Expression;
  consequent: Statement;
  alternate?: Statement;
}

// ============== 声明 ==============

export type Declaration =
  | FunctionDeclaration
  | VariableDeclaration;

export interface FunctionDeclaration extends BaseNode {
  type: 'FunctionDeclaration';
  identifier: Identifier;
  params: Pattern[];
  body: BlockStatement;
  async: boolean;
  generator: boolean;
}

export interface VariableDeclaration extends BaseNode {
  type: 'VariableDeclaration';
  kind: 'var' | 'let' | 'const';
  declarations: VariableDeclarator[];
}

export interface VariableDeclarator extends BaseNode {
  type: 'VariableDeclarator';
  id: Pattern;
  init?: Expression;
}

// ============== 表达式 ==============

export type Expression =
  | Identifier
  | Literal
  | ArrayExpression
  | ObjectExpression
  | FunctionExpression
  | ArrowFunctionExpression
  | CallExpression
  | MemberExpression
  | ConditionalExpression
  | BinaryExpression
  | UnaryExpression
  | JSXElement
  | JSXFragment;

export interface Identifier extends BaseNode {
  type: 'Identifier';
  value: string;
}

export type Literal =
  | StringLiteral
  | NumericLiteral
  | BooleanLiteral
  | NullLiteral;

export interface StringLiteral extends BaseNode {
  type: 'StringLiteral';
  value: string;
  raw?: string;
}

export interface NumericLiteral extends BaseNode {
  type: 'NumericLiteral';
  value: number;
}

export interface BooleanLiteral extends BaseNode {
  type: 'BooleanLiteral';
  value: boolean;
}

export interface NullLiteral extends BaseNode {
  type: 'NullLiteral';
}

export interface ArrayExpression extends BaseNode {
  type: 'ArrayExpression';
  elements: (Expression | SpreadElement | null)[];
}

export interface ObjectExpression extends BaseNode {
  type: 'ObjectExpression';
  properties: (Property | SpreadElement)[];
}

export interface Property extends BaseNode {
  type: 'KeyValueProperty' | 'AssignmentProperty';
  key: Expression;
  value: Expression;
}

export interface SpreadElement extends BaseNode {
  type: 'SpreadElement';
  arguments: Expression;
}

export interface FunctionExpression extends BaseNode {
  type: 'FunctionExpression';
  identifier?: Identifier;
  params: Pattern[];
  body: BlockStatement;
  async: boolean;
  generator: boolean;
}

export interface ArrowFunctionExpression extends BaseNode {
  type: 'ArrowFunctionExpression';
  params: Pattern[];
  body: BlockStatement | Expression;
  async: boolean;
}

export interface CallExpression extends BaseNode {
  type: 'CallExpression';
  callee: Expression;
  arguments: (Expression | SpreadElement)[];
}

export interface MemberExpression extends BaseNode {
  type: 'MemberExpression';
  object: Expression;
  property: Expression | Identifier;
  computed: boolean;
}

export interface ConditionalExpression extends BaseNode {
  type: 'ConditionalExpression';
  test: Expression;
  consequent: Expression;
  alternate: Expression;
}

export interface BinaryExpression extends BaseNode {
  type: 'BinaryExpression';
  operator: string;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression extends BaseNode {
  type: 'UnaryExpression';
  operator: string;
  argument: Expression;
  prefix: boolean;
}

// ============== 模式 ==============

export type Pattern =
  | Identifier
  | ObjectPattern
  | ArrayPattern
  | RestElement;

export interface ObjectPattern extends BaseNode {
  type: 'ObjectPattern';
  properties: (AssignmentProperty | RestElement)[];
}

export interface ArrayPattern extends BaseNode {
  type: 'ArrayPattern';
  elements: (Pattern | null)[];
}

export interface AssignmentProperty extends BaseNode {
  type: 'AssignmentProperty';
  key: Identifier;
  value: Pattern;
}

export interface RestElement extends BaseNode {
  type: 'RestElement';
  argument: Pattern;
}

// ============== JSX ==============

export interface JSXElement extends BaseNode {
  type: 'JSXElement';
  opening: JSXOpeningElement;
  closing?: JSXClosingElement;
  children: JSXChild[];
}

export interface JSXOpeningElement extends BaseNode {
  type: 'JSXOpeningElement';
  name: JSXElementName;
  attributes: JSXAttributeItem[];
  selfClosing: boolean;
}

export interface JSXClosingElement extends BaseNode {
  type: 'JSXClosingElement';
  name: JSXElementName;
}

export type JSXElementName =
  | Identifier
  | JSXMemberExpression
  | JSXNamespacedName;

export interface JSXMemberExpression extends BaseNode {
  type: 'JSXMemberExpression';
  object: JSXElementName;
  property: Identifier;
}

export interface JSXNamespacedName extends BaseNode {
  type: 'JSXNamespacedName';
  namespace: Identifier;
  name: Identifier;
}

export type JSXAttributeItem = JSXAttribute | JSXSpreadAttribute;

export interface JSXAttribute extends BaseNode {
  type: 'JSXAttribute';
  name: Identifier | JSXNamespacedName;
  value?: StringLiteral | JSXExpressionContainer | JSXElement | null;
}

export interface JSXSpreadAttribute extends BaseNode {
  type: 'JSXSpreadAttribute';
  argument: Expression;
}

export type JSXChild =
  | JSXText
  | JSXExpressionContainer
  | JSXSpreadChild
  | JSXElement
  | JSXFragment;

export interface JSXText extends BaseNode {
  type: 'JSXText';
  value: string;
  raw: string;
}

export interface JSXExpressionContainer extends BaseNode {
  type: 'JSXExpressionContainer';
  expression: Expression | JSXEmptyExpression;
}

export interface JSXEmptyExpression extends BaseNode {
  type: 'JSXEmptyExpression';
}

export interface JSXSpreadChild extends BaseNode {
  type: 'JSXSpreadChild';
  expression: Expression;
}

export interface JSXFragment extends BaseNode {
  type: 'JSXFragment';
  opening: JSXOpeningFragment;
  closing: JSXClosingFragment;
  children: JSXChild[];
}

export interface JSXOpeningFragment extends BaseNode {
  type: 'JSXOpeningFragment';
}

export interface JSXClosingFragment extends BaseNode {
  type: 'JSXClosingFragment';
}
