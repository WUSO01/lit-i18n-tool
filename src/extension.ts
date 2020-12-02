/**
 * 一个vscode小插件
 * @author <hi.wuso01@gmail.com>
 */

import * as vscode from 'vscode';
import * as _ from 'lodash';
import { replaceSelectedContent } from './replaceSelectedContent';

const { window } = vscode;

export function activate(context: vscode.ExtensionContext) {
  console.log('欢迎使用 Lit-i18n-tool....');

  /**
   * 对选中的内容进行替换
   */
  context.subscriptions.push(vscode.commands.registerTextEditorCommand('lit-i18n-tool.replaceSingle', async () => {
    // 获取输入的key
    const key: string | undefined = await window.showInputBox({
      prompt: '设置key',
      value: '',
      placeHolder: "请输入key值"
    })

    replaceSelectedContent(key);
  }));

}

export function deactivate() { }
