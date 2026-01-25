/**
 * AST 编辑服务测试
 * 运行: bun src/services/ast/test.ts
 */

import { astEditor, editCode, findNodes } from './index';

const testCode = `
import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div data-jsx-id="root" className="min-h-screen bg-gray-100">
      <header data-jsx-id="header" className="bg-blue-500 text-white p-4">
        <h1 data-jsx-id="title" className="text-2xl font-bold">Hello World</h1>
      </header>
      <main data-jsx-id="main" className="container mx-auto p-4">
        <button
          data-jsx-id="btn-counter"
          className="px-4 py-2 bg-green-500 text-white rounded"
          onClick={() => setCount(c => c + 1)}
        >
          Count: {count}
        </button>
      </main>
    </div>
  );
}
`;

async function runTests() {
  console.log('===== AST Editor Service Tests =====\n');

  // Test 1: Find all nodes
  console.log('Test 1: Find all nodes');
  const nodes = findNodes(testCode, 'src/App.tsx');
  console.log(`  Found ${nodes.length} nodes with data-jsx-id:`);
  nodes.forEach(n => console.log(`    - ${n.jsxId}: <${n.element}> className="${n.attributes.className}"`));
  console.log();

  // Test 2: Edit className (add classes)
  console.log('Test 2: Add classes to header');
  const result1 = await editCode(testCode, 'src/App.tsx', {
    jsxId: 'header',
    operation: {
      type: 'style',
      payload: { addClasses: ['shadow-lg', 'sticky', 'top-0'] },
    },
  });
  if (result1.success) {
    console.log('  Success! Changes:', result1.changes?.length);
    // Check if new classes are in the code
    if (result1.code?.includes('shadow-lg') && result1.code?.includes('sticky')) {
      console.log('  Verified: New classes added correctly');
    }
  } else {
    console.log('  Failed:', result1.error);
  }
  console.log();

  // Test 3: Replace className
  console.log('Test 3: Replace className on title');
  const result2 = await editCode(testCode, 'src/App.tsx', {
    jsxId: 'title',
    operation: {
      type: 'style',
      payload: { className: 'text-4xl font-extrabold text-yellow-300' },
    },
  });
  if (result2.success) {
    console.log('  Success! New className set');
    if (result2.code?.includes('text-4xl') && result2.code?.includes('text-yellow-300')) {
      console.log('  Verified: className replaced correctly');
    }
  } else {
    console.log('  Failed:', result2.error);
  }
  console.log();

  // Test 4: Find non-existent node
  console.log('Test 4: Find non-existent node');
  const result3 = await editCode(testCode, 'src/App.tsx', {
    jsxId: 'non-existent',
    operation: { type: 'style', payload: { addClasses: ['test'] } },
  });
  if (!result3.success) {
    console.log('  Correctly failed with:', result3.error);
  }
  console.log();

  // Test 5: Remove classes
  console.log('Test 5: Remove classes from button');
  const result4 = await editCode(testCode, 'src/App.tsx', {
    jsxId: 'btn-counter',
    operation: {
      type: 'style',
      payload: { removeClasses: ['rounded', 'bg-green-500'] },
    },
  });
  if (result4.success) {
    console.log('  Success!');
    if (!result4.code?.includes('bg-green-500') || result4.code?.includes('px-4')) {
      console.log('  Verified: Classes removed while others kept');
    }
  } else {
    console.log('  Failed:', result4.error);
  }
  console.log();

  // Test 6: Add attribute
  console.log('Test 6: Add attribute');
  const result5 = await editCode(testCode, 'src/App.tsx', {
    jsxId: 'main',
    operation: {
      type: 'attribute',
      payload: { name: 'id', value: 'main-content' },
    },
  });
  if (result5.success) {
    console.log('  Success!');
    if (result5.code?.includes('id="main-content"') || result5.code?.includes("id='main-content'")) {
      console.log('  Verified: Attribute added correctly');
    }
  } else {
    console.log('  Failed:', result5.error);
  }
  console.log();

  console.log('===== All tests completed =====');
}

runTests().catch(console.error);
