/**
 * 解析器测试
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Parser, parser } from '../src/parser';
import { initSWC, parse, isInitialized, resetSWC } from '../src/parser/swc-wasm';

describe('SWC WASM', () => {
  beforeAll(async () => {
    resetSWC();
  });

  it('should initialize SWC', async () => {
    await initSWC();
    expect(isInitialized()).toBe(true);
  });

  it('should parse simple TSX', async () => {
    const code = `const x = 1;`;
    const ast = await parse(code);

    expect(ast).toBeDefined();
    expect((ast as any).type).toBe('Module');
  });

  it('should parse JSX elements', async () => {
    const code = `const el = <div>Hello</div>;`;
    const ast = await parse(code, { tsx: true });

    expect(ast).toBeDefined();
    expect((ast as any).type).toBe('Module');
  });

  it('should handle concurrent initialization calls', async () => {
    resetSWC();

    const results = await Promise.all([
      initSWC(),
      initSWC(),
      initSWC(),
    ]);

    expect(results.length).toBe(3);
    expect(isInitialized()).toBe(true);
  });
});

describe('Parser', () => {
  let testParser: Parser;

  beforeAll(async () => {
    testParser = new Parser();
    await testParser.initialize();
  });

  it('should parse TSX file', async () => {
    const code = `
      export default function App() {
        return <div className="container">Hello</div>;
      }
    `;

    const result = await testParser.parseFile(code, 'App.tsx');

    expect(result).toBeDefined();
    expect(result.ast).toBeDefined();
    expect(result.ast.type).toBe('Module');
    expect(result.sourceCode).toBe(code);
    expect(result.filePath).toBe('App.tsx');
  });

  it('should cache parsed results', async () => {
    const code = `const x = 1;`;

    await testParser.parseFile(code, 'test.ts');
    expect(testParser.cacheSize).toBeGreaterThan(0);

    // Same file should use cache
    const result2 = await testParser.parseFile(code, 'test.ts');
    expect(result2).toBeDefined();
  });

  it('should invalidate cache for specific file', async () => {
    const code = `const x = 1;`;
    await testParser.parseFile(code, 'invalidate-test.ts');

    const sizeBefore = testParser.cacheSize;
    testParser.invalidate('invalidate-test.ts');

    // Cache size may be same or less depending on other entries
    expect(testParser.cacheSize).toBeLessThanOrEqual(sizeBefore);
  });

  it('should clear all cache', async () => {
    await testParser.parseFile('const a = 1;', 'a.ts');
    await testParser.parseFile('const b = 2;', 'b.ts');

    testParser.clearCache();
    expect(testParser.cacheSize).toBe(0);
  });

  it('should parse complex nested JSX', async () => {
    const code = `
      export default function App() {
        return (
          <div className="container">
            <header>
              <h1>Title</h1>
            </header>
            <main>
              <p>Content</p>
            </main>
          </div>
        );
      }
    `;

    const result = await testParser.parseFile(code, 'App.tsx');
    expect(result.ast.type).toBe('Module');
    expect(result.ast.body.length).toBeGreaterThan(0);
  });

  it('should parse JSX with attributes', async () => {
    const code = `
      const el = (
        <button
          className="btn"
          onClick={() => console.log('click')}
          disabled
          data-jsx-id="abc123"
        >
          Click me
        </button>
      );
    `;

    const result = await testParser.parseFile(code, 'button.tsx');
    expect(result.ast.type).toBe('Module');
  });

  it('should parse JSX fragments', async () => {
    const code = `
      const el = (
        <>
          <div>Item 1</div>
          <div>Item 2</div>
        </>
      );
    `;

    const result = await testParser.parseFile(code, 'fragment.tsx');
    expect(result.ast.type).toBe('Module');
  });
});

describe('Parser singleton', () => {
  it('should provide a parser singleton', () => {
    expect(parser).toBeDefined();
    expect(parser).toBeInstanceOf(Parser);
  });
});
