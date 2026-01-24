# AST Processor

客户端 AST 处理系统，支持安全的声明式代码修改。

## 功能特性

- **SWC WASM 集成**: 浏览器端高性能 AST 解析
- **AST 遍历器**: 灵活的访问者模式节点遍历
- **JSX ID 定位**: 通过 data-jsx-id 属性精确定位 JSX 节点
- **AST 变换器**: 支持文本、样式、属性、结构的声明式修改
- **代码生成**: AST 到代码的转换，支持格式化输出
- **Tailwind 映射**: CSS 属性到 Tailwind 类名的自动转换

## 安装

```bash
npm install ast-processor
```

## 快速开始

```typescript
import { createASTProcessor } from 'ast-processor';

const processor = createASTProcessor();

// 初始化 (加载 SWC WASM)
await processor.initialize();

// 解析代码
const code = `
  export default function App() {
    return <div data-jsx-id="test">Hello World</div>;
  }
`;

const { ast } = await processor.parse(code, 'App.tsx');

// 变换代码
const result = await processor.transform(code, 'App.tsx', {
  jsxId: 'test',
  operation: {
    type: 'text',
    payload: { text: '你好世界' }
  }
});

console.log(result.code);
```

## API 参考

### 解析器

```typescript
import { parser, parse, initSWC } from 'ast-processor';

// 初始化 SWC
await initSWC();

// 解析代码
const ast = await parse(code, { syntax: 'typescript', tsx: true });

// 使用 Parser 类
await parser.initialize();
const { ast, sourceCode, filePath } = await parser.parseFile(code, 'App.tsx');
```

### 遍历器

```typescript
import { traverse, findNodeByJsxId, findAllJsxNodes } from 'ast-processor';

// 遍历 AST
traverse(ast, {
  JSXElement(node, context) {
    console.log('Found JSX element');
    // context.stop() - 停止遍历
    // context.skip() - 跳过子节点
  },
  JSXOpeningElement: {
    enter(node, context) {
      console.log('Entering JSX opening element');
    },
    exit(node, context) {
      console.log('Exiting JSX opening element');
    }
  }
});

// 根据 JSX ID 查找节点
const nodeInfo = findNodeByJsxId(ast, 'test-id');
// nodeInfo: { node, parent, path, jsxId, element, attributes, children }

// 获取所有带 JSX ID 的节点
const allNodes = findAllJsxNodes(ast);
```

### 变换器

```typescript
import {
  transformCode,
  batchTransformCode,
  updateText,
  updateStyle,
  updateAttribute
} from 'ast-processor';

// 单次变换
const result = await transformCode(code, 'App.tsx', {
  jsxId: 'test',
  operation: {
    type: 'text',
    payload: { text: 'New text' }
  }
});

// 批量变换
const result = await batchTransformCode(code, 'App.tsx', [
  { jsxId: 'test', operation: { type: 'text', payload: { text: 'New text' } } },
  { jsxId: 'test', operation: { type: 'style', payload: { addClasses: ['bg-blue-500'] } } }
]);

// 直接使用变换函数
const result = updateText(ast, 'test', 'New text');
const result = updateStyle(ast, 'test', { className: 'flex items-center' });
const result = updateAttribute(ast, 'test', 'title', 'Hello');
```

### 样式变换选项

```typescript
// 完全替换 className
updateStyle(ast, 'test', { className: 'new-class' });

// 添加类名
updateStyle(ast, 'test', { addClasses: ['bg-blue-500', 'text-white'] });

// 移除类名
updateStyle(ast, 'test', { removeClasses: ['old-class'] });

// 设置行内样式
updateStyle(ast, 'test', {
  style: {
    'background-color': 'red',
    'font-size': '16px'
  }
});
```

### Tailwind 工具

```typescript
import {
  cssToTailwind,
  cssObjectToTailwind,
  mergeClasses,
  getPresetClasses
} from 'ast-processor';

// CSS 属性转 Tailwind 类名
cssToTailwind('font-size', '16px');     // 'text-base'
cssToTailwind('display', 'flex');       // 'flex'
cssToTailwind('padding', '16px');       // 'p-4'

// CSS 对象转 Tailwind 类名数组
const classes = cssObjectToTailwind({
  'display': 'flex',
  'justify-content': 'center',
  'padding': '16px'
});
// ['flex', 'justify-center', 'p-4']

// 合并类名 (处理冲突)
mergeClasses(['text-sm', 'p-4'], ['text-lg']);
// ['text-lg', 'p-4'] - text-lg 覆盖 text-sm

// 使用预设
const cardClasses = getPresetClasses('card');
// ['bg-white', 'rounded-lg', 'shadow', 'p-4']
```

### 代码生成

```typescript
import { generateCode, generateCodeSync, parser } from 'ast-processor';

// 异步生成 (使用 SWC)
const code = await generateCode(ast);

// 同步生成 (使用自定义打印器)
const code = generateCodeSync(ast, { singleQuote: true, semicolons: true });

// 使用 parser 生成
const code = await parser.generate(ast);
```

## 变换操作类型

| 类型 | 描述 | Payload |
|------|------|---------|
| `text` | 修改文本内容 | `{ text: string }` |
| `style` | 修改样式 | `{ className?, addClasses?, removeClasses?, style? }` |
| `attribute` | 修改属性 | `{ name: string, value: string \| boolean \| null }` |

## 预设列表

### 布局预设
- `center` - 水平垂直居中
- `stack` - 垂直堆叠
- `row` - 水平排列
- `space-between` - 两端对齐

### 文本预设
- `heading-1` ~ `heading-4` - 标题样式
- `body` - 正文样式
- `caption` - 说明文字

### 组件预设
- `card` - 卡片样式
- `btn-primary` - 主要按钮
- `btn-secondary` - 次要按钮
- `input` - 输入框样式

## 测试

```bash
npm test
```

## 构建

```bash
npm run build
```

## 性能指标

| 指标 | 目标值 |
|------|--------|
| SWC WASM 加载 | < 500ms |
| 解析 1000 行代码 | < 50ms |
| 单次变换 | < 10ms |
| 代码生成 | < 20ms |

## 依赖

- `@swc/wasm-web` - SWC WASM 模块

## License

MIT
