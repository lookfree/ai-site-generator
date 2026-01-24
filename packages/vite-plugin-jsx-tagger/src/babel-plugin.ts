import type { PluginObj, types as t } from '@babel/core';
import { generateStableId } from './id-generator';
import type { BabelPluginOptions, JsxLocation, SourceMapManagerInterface } from './types';

/**
 * 获取 JSX 元素名称
 */
function getElementName(
  name: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName,
  types: typeof t
): string | null {
  if (types.isJSXIdentifier(name)) {
    return name.name;
  }
  if (types.isJSXMemberExpression(name)) {
    const objectName = getElementName(name.object, types);
    return objectName ? `${objectName}.${name.property.name}` : null;
  }
  if (types.isJSXNamespacedName(name)) {
    return `${name.namespace.name}:${name.name.name}`;
  }
  return null;
}

/**
 * 检查是否已有 data-jsx-id 属性
 */
function hasJsxIdAttribute(
  attributes: (t.JSXAttribute | t.JSXSpreadAttribute)[],
  types: typeof t
): boolean {
  return attributes.some(
    attr =>
      types.isJSXAttribute(attr) &&
      types.isJSXIdentifier(attr.name) &&
      attr.name.name === 'data-jsx-id'
  );
}

/**
 * 创建 JSX 属性
 */
function createJsxAttribute(
  types: typeof t,
  name: string,
  value: string
): t.JSXAttribute {
  return types.jsxAttribute(
    types.jsxIdentifier(name),
    types.stringLiteral(value)
  );
}

/**
 * JSX Tagger Babel 插件
 *
 * 为所有原生 HTML 元素注入 data-jsx-* 属性，用于 Visual Edit 功能
 */
export function jsxTaggerBabelPlugin(
  { types }: { types: typeof t }
): PluginObj<{ opts: BabelPluginOptions }> {
  return {
    name: 'jsx-tagger',

    visitor: {
      JSXOpeningElement(path, state) {
        const opts = state.opts;
        const { sourceMapManager, filePath, idPrefix = '' } = opts;

        // 获取位置信息
        const loc = path.node.loc;
        if (!loc) return;

        const line = loc.start.line;
        const column = loc.start.column;

        // 获取元素名称
        const elementName = getElementName(path.node.name, types);

        // 只处理原生 HTML 元素 (小写开头)
        // 跳过 React 组件 (大写开头) 和 Fragment (<>)
        if (!elementName || !/^[a-z]/.test(elementName)) return;

        // 检查是否已有 data-jsx-id (避免重复处理)
        if (hasJsxIdAttribute(path.node.attributes, types)) return;

        // 生成稳定 ID
        const jsxId = generateStableId(filePath, line, column, idPrefix);

        // 记录源码映射
        const location: JsxLocation = {
          id: jsxId,
          file: filePath,
          line,
          column,
          element: elementName,
        };
        sourceMapManager.set(jsxId, location);

        // 注入属性
        const attributes: t.JSXAttribute[] = [
          createJsxAttribute(types, 'data-jsx-id', jsxId),
          createJsxAttribute(types, 'data-jsx-file', filePath),
          createJsxAttribute(types, 'data-jsx-line', String(line)),
          createJsxAttribute(types, 'data-jsx-col', String(column)),
        ];

        path.node.attributes.push(...attributes);
      },
    },
  };
}
