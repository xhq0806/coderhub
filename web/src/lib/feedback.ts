// 轻量反馈工具集中封装确认类操作，后续可替换为自定义确认弹窗。
export function confirmDanger(message: string) {
  return window.confirm(message);
}
