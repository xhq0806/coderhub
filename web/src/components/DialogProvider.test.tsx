// by AI.Coding：Dialog 组件测试确认危险操作结果、Escape 取消和焦点恢复。
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DialogProvider } from './DialogProvider';
import { confirmDanger } from '../lib/feedback';

function DialogFixture() {
  // by AI.Coding：测试按钮模拟业务调用方，仅在确认后展示执行结果。
  async function handleDelete() {
    const confirmed = await confirmDanger('确定删除测试记录吗？');
    if (confirmed) document.body.dataset.confirmed = 'true';
  }

  return <button type="button" onClick={handleDelete}>删除记录</button>;
}

describe('DialogProvider', () => {
  it('确认后解析 true 并恢复触发按钮焦点', async () => {
    const user = userEvent.setup();
    render(<DialogProvider><DialogFixture /></DialogProvider>);
    const trigger = screen.getByRole('button', { name: '删除记录' });

    await user.click(trigger);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认' }));

    expect(document.body.dataset.confirmed).toBe('true');
    expect(trigger).toHaveFocus();
    delete document.body.dataset.confirmed;
  });

  it('快速重复确认只解析当前请求一次', async () => {
    const user = userEvent.setup();
    let confirmations = 0;
    function DoubleClickFixture() {
      async function handleDelete() {
        if (await confirmDanger('确定删除测试记录吗？')) confirmations += 1;
      }
      return <button type="button" onClick={handleDelete}>重复确认</button>;
    }
    render(<DialogProvider><DoubleClickFixture /></DialogProvider>);

    await user.click(screen.getByRole('button', { name: '重复确认' }));
    const confirmButton = screen.getByRole('button', { name: '确认' });
    await user.dblClick(confirmButton);

    expect(confirmations).toBe(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('Escape 取消危险操作', async () => {
    const user = userEvent.setup();
    render(<DialogProvider><DialogFixture /></DialogProvider>);

    await user.click(screen.getByRole('button', { name: '删除记录' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(document.body.dataset.confirmed).toBeUndefined();
  });
});
