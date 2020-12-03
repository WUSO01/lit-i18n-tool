import * as vscode from 'vscode';
import { getConfiguration } from './utils';
import { Pos } from './typing';

const { window } = vscode

/**
 * 替换选择的文本
 * @param key 输入的key
 * @params taggedTemplateNodesPos
 * 
 * 目前考虑的两种情况：
 * [lit-element]：
 * 
 * render() {
 *   return html`
 *     <div>张三</div>     ----> <div>${i18n('name')}</div>
 *   `
 * }
 * 
 * [正常情况]:
 * 
 * const obj = {
 *   name: 张三    ----> name: i18n('name')
 * }
 */
export async function replaceSelectedContent(key: string, taggedTemplateNodesPos: Pos[]) {
  const activeEditor = window.activeTextEditor
  if (!activeEditor) return;

  const selection = activeEditor.selection;
  const { start, end } = selection;

  const document = activeEditor.document;
  const edit = new vscode.WorkspaceEdit();

  const fn = getConfiguration('func');

  // 目前只考虑当前文件只有一个 html``
  const { startLine, endLine } = taggedTemplateNodesPos.length ? taggedTemplateNodesPos[0] : { startLine: 0, endLine: 0 };

  if (start.line > startLine && end.line < endLine) {
    edit.replace(document.uri, new vscode.Range(start, end), `\$\{${fn}('${key}')\}`);
  } else {
    // 需要把引号移除掉
    edit.replace(document.uri, new vscode.Range(start.line, start.character - 1, end.line, end.character + 1), `${fn}('${key}')`);
  }

  // 更新编辑器
  await vscode.workspace.applyEdit(edit);
}
