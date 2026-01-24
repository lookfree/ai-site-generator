/**
 * 变换器测试
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parser } from '../src/parser';
import { updateText, appendText, clearChildren } from '../src/transformers/text';
import { updateStyle, addClasses, setClassName, setInlineStyle } from '../src/transformers/style';
import { updateAttribute, setAttributes, removeAttribute } from '../src/transformers/attribute';
import { removeNode, insertNode, wrapNode, unwrapNode } from '../src/transformers/structure';
import { transformCode, batchTransformCode } from '../src/transformers';

describe('TextTransformer', () => {
  beforeAll(async () => {
    await parser.initialize();
  });

  it('should update text content', async () => {
    const code = `
      export default function App() {
        return <div data-jsx-id="test">Hello World</div>;
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const result = updateText(ast, 'test', '你好世界');

    expect(result.success).toBe(true);
    expect(result.changes?.length).toBeGreaterThan(0);
  });

  it('should fail for non-existent JSX ID', async () => {
    const code = `
      export default function App() {
        return <div>Hello</div>;
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const result = updateText(ast, 'non-existent', 'New text');

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should record changes', async () => {
    const code = `
      export default function App() {
        return <div data-jsx-id="test">Old text</div>;
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const result = updateText(ast, 'test', 'New text');

    expect(result.changes).toBeDefined();
    expect(result.changes?.length).toBeGreaterThan(0);
    expect(result.changes?.[0].type).toBe('modify');
  });
});

describe('StyleTransformer', () => {
  beforeAll(async () => {
    await parser.initialize();
  });

  it('should add classes', async () => {
    const code = `
      export default function App() {
        return <div data-jsx-id="test" className="existing">Content</div>;
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const result = addClasses(ast, 'test', ['new-class', 'another']);

    expect(result.success).toBe(true);
  });

  it('should replace className', async () => {
    const code = `
      export default function App() {
        return <div data-jsx-id="test" className="old-class">Content</div>;
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const result = setClassName(ast, 'test', 'new-class');

    expect(result.success).toBe(true);
  });

  it('should handle removeClasses', async () => {
    const code = `
      export default function App() {
        return <div data-jsx-id="test" className="keep remove-me">Content</div>;
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const result = updateStyle(ast, 'test', { removeClasses: ['remove-me'] });

    expect(result.success).toBe(true);
  });

  it('should add className to element without className', async () => {
    const code = `
      export default function App() {
        return <div data-jsx-id="test">Content</div>;
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const result = setClassName(ast, 'test', 'new-class');

    expect(result.success).toBe(true);
  });

  it('should set inline style', async () => {
    const code = `
      export default function App() {
        return <div data-jsx-id="test">Content</div>;
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const result = setInlineStyle(ast, 'test', {
      'background-color': 'red',
      'font-size': '16px',
    });

    expect(result.success).toBe(true);
  });
});

describe('AttributeTransformer', () => {
  beforeAll(async () => {
    await parser.initialize();
  });

  it('should add new attribute', async () => {
    const code = `
      export default function App() {
        return <div data-jsx-id="test">Content</div>;
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const result = updateAttribute(ast, 'test', 'title', 'Hello');

    expect(result.success).toBe(true);
  });

  it('should update existing attribute', async () => {
    const code = `
      export default function App() {
        return <div data-jsx-id="test" title="Old">Content</div>;
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const result = updateAttribute(ast, 'test', 'title', 'New');

    expect(result.success).toBe(true);
  });

  it('should remove attribute', async () => {
    const code = `
      export default function App() {
        return <div data-jsx-id="test" title="Remove me">Content</div>;
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const result = removeAttribute(ast, 'test', 'title');

    expect(result.success).toBe(true);
  });

  it('should add boolean attribute', async () => {
    const code = `
      export default function App() {
        return <button data-jsx-id="test">Click</button>;
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const result = updateAttribute(ast, 'test', 'disabled', true);

    expect(result.success).toBe(true);
  });

  it('should not modify data-jsx-* attributes', async () => {
    const code = `
      export default function App() {
        return <div data-jsx-id="test">Content</div>;
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const result = updateAttribute(ast, 'test', 'data-jsx-id', 'new-id');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot modify');
  });

  it('should set multiple attributes', async () => {
    const code = `
      export default function App() {
        return <div data-jsx-id="test">Content</div>;
      }
    `;
    const { ast } = await parser.parseFile(code, 'App.tsx');

    const result = setAttributes(ast, 'test', {
      title: 'Title',
      'aria-label': 'Label',
      hidden: true,
    });

    expect(result.success).toBe(true);
    expect(result.changes?.length).toBeGreaterThan(0);
  });
});

describe('transformCode', () => {
  beforeAll(async () => {
    await parser.initialize();
  });

  it('should transform text', async () => {
    const code = `
      export default function App() {
        return <div data-jsx-id="test">Hello</div>;
      }
    `;

    const result = await transformCode(code, 'App.tsx', {
      jsxId: 'test',
      operation: { type: 'text', payload: { text: 'World' } },
    });

    expect(result.result.success).toBe(true);
    expect(result.code).toBeDefined();
  });

  it('should transform style', async () => {
    const code = `
      export default function App() {
        return <div data-jsx-id="test">Content</div>;
      }
    `;

    const result = await transformCode(code, 'App.tsx', {
      jsxId: 'test',
      operation: { type: 'style', payload: { className: 'new-class' } },
    });

    expect(result.result.success).toBe(true);
  });

  it('should transform attribute', async () => {
    const code = `
      export default function App() {
        return <div data-jsx-id="test">Content</div>;
      }
    `;

    const result = await transformCode(code, 'App.tsx', {
      jsxId: 'test',
      operation: { type: 'attribute', payload: { name: 'title', value: 'Hello' } },
    });

    expect(result.result.success).toBe(true);
  });
});

describe('batchTransformCode', () => {
  beforeAll(async () => {
    await parser.initialize();
  });

  it('should apply multiple transforms', async () => {
    const code = `
      export default function App() {
        return <div data-jsx-id="test">Hello</div>;
      }
    `;

    const result = await batchTransformCode(code, 'App.tsx', [
      {
        jsxId: 'test',
        operation: { type: 'text', payload: { text: 'World' } },
      },
      {
        jsxId: 'test',
        operation: { type: 'style', payload: { className: 'new-class' } },
      },
    ]);

    expect(result.results.length).toBe(2);
    expect(result.results.every(r => r.success)).toBe(true);
  });

  it('should stop on first failure', async () => {
    const code = `
      export default function App() {
        return <div data-jsx-id="test">Hello</div>;
      }
    `;

    const result = await batchTransformCode(code, 'App.tsx', [
      {
        jsxId: 'non-existent',
        operation: { type: 'text', payload: { text: 'World' } },
      },
      {
        jsxId: 'test',
        operation: { type: 'style', payload: { className: 'new-class' } },
      },
    ]);

    expect(result.results.length).toBe(1);
    expect(result.results[0].success).toBe(false);
  });
});
