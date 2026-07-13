// by AI.Coding：浏览器主链路验证登录回跳、发表评论和自定义危险确认 Dialog，使用固定 E2E 内容避免定位歧义。
import { expect, test } from '@playwright/test';

test('登录后发表评论并可取消删除确认', async ({ page }) => {
  await page.goto('/');
  const firstContent = page.getByText('E2E 公开动态', { exact: true });
  await expect(firstContent).toBeVisible();
  await firstContent.click();

  await page.getByRole('button', { name: '发表评论' }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('用户名').fill(process.env.E2E_USER_NAME || 'alice');
  await page.getByLabel('密码').fill(process.env.E2E_USER_PASSWORD || '123456');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/contents\//);

  await page.getByPlaceholder('写下你的评论').fill('Playwright 主链路评论');
  await page.getByRole('button', { name: '发表评论' }).click();
  const createdComment = page.locator('.comment-body', { hasText: 'Playwright 主链路评论' }).first();
  await expect(createdComment).toBeVisible();

  const deleteButton = page.getByRole('button', { name: '删除评论' }).first();
  await deleteButton.click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toBeHidden();
  await expect(createdComment).toBeVisible();
});
