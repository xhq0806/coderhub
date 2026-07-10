// by AI.Coding：测试初始化集中扩展 DOM 断言，并在用例后清理 React 挂载节点。
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// by AI.Coding：Vitest 未启用 globals 时显式注册清理，确保测试之间没有 DOM 污染。
afterEach(() => cleanup());
