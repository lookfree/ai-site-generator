/**
 * 代码生成器测试
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parser } from '../src/parser';
import { Generator, generateCode, generateCodeSync } from '../src/generator';
import { Printer, createPrinter, printAST } from '../src/generator/printer';

describe('Generator', () => {
  beforeAll(async () => {
    await parser.initialize();
  });

  it('should generate code from AST using SWC', async () => {
    const code = `const x = 1;`;
    const { ast } = await parser.parseFile(code, 'test.ts');

    const generator = new Generator({ useSwc: true });
    const generated = await generator.generate(ast);

    expect(generated).toBeDefined();
    expect(generated.length).toBeGreaterThan(0);
  });

  it('should generate code from AST using custom printer', async () => {
    const code = `const x = 1;`;
    const { ast } = await parser.parseFile(code, 'test.ts');

    const generator = new Generator({ useSwc: false });
    const generated = await generator.generate(ast);

    expect(generated).toBeDefined();
  });

  it('should use generateCode helper', async () => {
    const code = `const x = 1;`;
    const { ast } = await parser.parseFile(code, 'test.ts');

    const generated = await generateCode(ast);

    expect(generated).toBeDefined();
  });
});

describe('Printer', () => {
  beforeAll(async () => {
    await parser.initialize();
  });

  it('should print simple AST', async () => {
    const code = `const x = 1;`;
    const { ast } = await parser.parseFile(code, 'test.ts');

    const printer = new Printer();
    const result = printer.print(ast);

    expect(result).toBeDefined();
  });

  it('should respect singleQuote option', () => {
    const printer = createPrinter({ singleQuote: true });
    const node = { type: 'StringLiteral', value: 'hello' };

    const result = printer.print(node);

    expect(result).toBe("'hello'");
  });

  it('should respect double quote option', () => {
    const printer = createPrinter({ singleQuote: false });
    const node = { type: 'StringLiteral', value: 'hello' };

    const result = printer.print(node);

    expect(result).toBe('"hello"');
  });

  it('should print identifier', () => {
    const printer = new Printer();
    const node = { type: 'Identifier', value: 'myVar' };

    const result = printer.print(node);

    expect(result).toBe('myVar');
  });

  it('should use printAST helper', async () => {
    const code = `const x = 1;`;
    const { ast } = await parser.parseFile(code, 'test.ts');

    const result = printAST(ast);

    expect(result).toBeDefined();
  });

  it('should generate sync code', async () => {
    const code = `const x = 1;`;
    const { ast } = await parser.parseFile(code, 'test.ts');

    const result = generateCodeSync(ast);

    expect(result).toBeDefined();
  });
});
