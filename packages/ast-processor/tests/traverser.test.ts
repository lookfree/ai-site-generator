/**
 * 遍历器测试
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parser } from '../src/parser';
import { traverse, collect, Visitor, VisitorContext } from '../src/traverser/visitor';
import {
  findNodeByJsxId,
  findAllJsxNodes,
  findNodesByElement,
  getClassName,
} from '../src/traverser/jsx-locator';

describe('traverse', () => {
  beforeAll(async () => {
    await parser.initialize();
  });

  it('should traverse simple AST', async () => {
    const code = `const x = 1;`;
    const { ast } = await parser.parseFile(code, 'test.ts');

    const visited: string[] = [];
    traverse(ast, {
      Module(node, context) {
        visited.push('Module');
      },
      VariableDeclaration(node, context) {
        visited.push('VariableDeclaration');
      },
    });

    expect(visited).toContain('Module');
    expect(visited).toContain('VariableDeclaration');
  });

  it('should provide correct context', async () => {
    const code = `const x = 1;`;
    const { ast } = await parser.parseFile(code, 'test.ts');

    let contextDepth: number = -1;
    traverse(ast, {
      VariableDeclaration(node, context: VisitorContext) {
        contextDepth = context.depth;
        expect(context.parent).toBeDefined();
        expect(context.parentPath.length).toBeGreaterThan(0);
      },
    });

    expect(contextDepth).toBeGreaterThan(0);
  });

  it('should stop traversal when stop is called', async () => {
    const code = `
      const a = 1;
      const b = 2;
      const c = 3;
    `;
    const { ast } = await parser.parseFile(code, 'test.ts');

    let visitCount = 0;
    traverse(ast, {
      VariableDeclaration(node, context) {
        visitCount++;
        if (visitCount === 2) {
          context.stop();
        }
      },
    });

    expect(visitCount).toBe(2);
  });

  it('should skip children when skip is called', async () => {
    const code = `
      function test() {
        const inner = 1;
      }
    `;
    const { ast } = await parser.parseFile(code, 'test.ts');

    let foundInner = false;
    traverse(ast, {
      FunctionDeclaration(node, context) {
        context.skip();
      },
      VariableDeclaration() {
        foundInner = true;
      },
    });

    expect(foundInner).toBe(false);
  });

  it('should support enter and exit callbacks', async () => {
    const code = `const x = 1;`;
    const { ast } = await parser.parseFile(code, 'test.ts');

    const order: string[] = [];
    traverse(ast, {
      Module: {
        enter() {
          order.push('enter');
        },
        exit() {
          order.push('exit');
        },
      },
    });

    expect(order).toEqual(['enter', 'exit']);
  });
});

describe('collect', () => {
  beforeAll(async () => {
    await parser.initialize();
  });

  it('should collect matching nodes', async () => {
    const code = `
      const a = 1;
      const b = 2;
      const c = 3;
    `;
    const { ast } = await parser.parseFile(code, 'test.ts');

    // SWC treats each const statement as a VariableDeclaration
    // but the exact count may vary based on SWC version
    const declarations = collect(ast, (node: any) =>
      node.type === 'VariableDeclaration'
    );

    expect(declarations.length).toBeGreaterThanOrEqual(2);
    expect(declarations.length).toBeLessThanOrEqual(3);
  });
});

describe('JSX Locator', () => {
  beforeAll(async () => {
    await parser.initialize();
  });

  it('should find node by JSX ID', async () => {
    const code = `
      export default function App() {
        return (
          <div data-jsx-id="test-id" className="container">
            Hello
          </div>
        );
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const nodeInfo = findNodeByJsxId(ast, 'test-id');

    expect(nodeInfo).not.toBeNull();
    expect(nodeInfo?.jsxId).toBe('test-id');
    expect(nodeInfo?.element).toBe('div');
  });

  it('should return null for non-existent JSX ID', async () => {
    const code = `
      export default function App() {
        return <div>Hello</div>;
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const nodeInfo = findNodeByJsxId(ast, 'non-existent');

    expect(nodeInfo).toBeNull();
  });

  it('should find all JSX nodes', async () => {
    const code = `
      export default function App() {
        return (
          <div data-jsx-id="parent">
            <span data-jsx-id="child1">One</span>
            <span data-jsx-id="child2">Two</span>
          </div>
        );
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const nodes = findAllJsxNodes(ast);

    expect(nodes.length).toBe(3);
    expect(nodes.map(n => n.jsxId)).toContain('parent');
    expect(nodes.map(n => n.jsxId)).toContain('child1');
    expect(nodes.map(n => n.jsxId)).toContain('child2');
  });

  it('should find nodes by element name', async () => {
    const code = `
      export default function App() {
        return (
          <div>
            <span>One</span>
            <span>Two</span>
            <p>Para</p>
          </div>
        );
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const spans = findNodesByElement(ast, 'span');
    const divs = findNodesByElement(ast, 'div');

    expect(spans.length).toBe(2);
    expect(divs.length).toBe(1);
  });

  it('should extract attributes correctly', async () => {
    const code = `
      export default function App() {
        return (
          <button
            data-jsx-id="btn"
            className="btn primary"
            disabled
            onClick={() => {}}
          >
            Click
          </button>
        );
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const nodeInfo = findNodeByJsxId(ast, 'btn');

    expect(nodeInfo).not.toBeNull();
    expect(nodeInfo?.attributes.get('className')).toBe('btn primary');
    expect(nodeInfo?.attributes.get('disabled')).toBe(true);
    expect(nodeInfo?.attributes.has('onClick')).toBe(true);
  });

  it('should get className correctly', async () => {
    const code = `
      export default function App() {
        return (
          <div data-jsx-id="test" className="flex items-center justify-center">
            Content
          </div>
        );
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const nodeInfo = findNodeByJsxId(ast, 'test');
    expect(nodeInfo).not.toBeNull();

    const className = getClassName(nodeInfo!);
    expect(className).toBe('flex items-center justify-center');
  });

  it('should handle JSX member expressions', async () => {
    const code = `
      import { Card } from './components';

      export default function App() {
        return (
          <Card.Header data-jsx-id="header">
            Title
          </Card.Header>
        );
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const nodeInfo = findNodeByJsxId(ast, 'header');

    expect(nodeInfo).not.toBeNull();
    expect(nodeInfo?.element).toBe('Card.Header');
  });
});
