import * as vscode from 'vscode';
import { generateJson, getConfiguration } from './utils';

/**
 * 替换选中的文本
 */
export function replaceSelectedContent(key: string | undefined) {
  if (!key) {
    vscode.window.showErrorMessage('key不能为空');
    return;
  }

  let activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) return;

  // 获取选中的内容
  const selection = activeEditor.selection;
  const selectedText = activeEditor.document.getText(selection);

  // 选中位置的坐标
  const { start, end } = selection;
  const document: vscode.TextDocument = activeEditor.document;
  const edit = new vscode.WorkspaceEdit();

  edit.replace(document.uri, new vscode.Range(start, end), replacedContent(key));
  generateJson(key, selectedText);

  // 更新编辑器内容
  vscode.workspace.applyEdit(edit);
  // 成功提示
  vscode.window.showInformationMessage(`成功替换当前文本`);
}

/**
 * 替换后的文本
 */
function replacedContent(key: string): string {
  const fn = getConfiguration('func');
  return `\$\{${fn}('${key}')\}`;
}
