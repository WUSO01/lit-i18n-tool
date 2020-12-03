/**
 * 一个vscode小插件
 * @author <hi.wuso01@gmail.com>
 */

import * as vscode from 'vscode';
import * as _ from 'lodash';
import * as fs from 'fs-extra';
import { tsquery } from '@phenomnomnominal/tsquery'
import { replaceSelectedContent } from './replaceSelectedContent';
import { generateJson, analysisJson, getConfiguration } from './utils'
import { Pos } from './typing';

const { window } = vscode;

export function activate(context: vscode.ExtensionContext) {
  const taggedTemplateNodesPos: Pos[] = []

  console.log('欢迎使用 Lit-i18n-tool....');

  init()

  /**
   * 根据当前选择的内容生成key
   * 检查是否有当前内容的翻译，或者相似内容的翻译
   * 如果有显示已经翻译的列表
   * 反之直接显示key的输入框
   */
  context.subscriptions.push(vscode.commands.registerTextEditorCommand('lit-i18n-tool.replaceSingle', async () => {
    const activeEditor = window.activeTextEditor;
    if (!activeEditor) return;

    const selection = activeEditor.selection;
    const selectedText = activeEditor.document.getText(selection);

    const list = analysisJson(selectedText)

    if (list?.length) {
      const pickList = list.map(item => {
        return {
          label: item.value,
          description: item.key
        }
      });

      const picked = await window.showQuickPick(pickList, {
        placeHolder: '当前文本已有翻译模版'
      })

      if (picked) return replaceSelectedContent(picked.description, taggedTemplateNodesPos)
    }

    // 获取输入的key
    const key: string | undefined = await window.showInputBox({
      prompt: '设置key',
      value: '',
      placeHolder: "请输入key值"
    })

    if (!key) {
      return window.showErrorMessage('key不能为空');
    }

    await generateJson(key, selectedText)
    await replaceSelectedContent(key, taggedTemplateNodesPos);

    window.showInformationMessage(`成功替换当前文本`);
  }));

  /**
   * 跳转
   */
  context.subscriptions.push(vscode.languages.registerDefinitionProvider(['javascript', 'typescript'], {
    provideDefinition: (document, position) => {
      const word = document.getText(document.getWordRangeAtPosition(position))

      const filename = `${vscode.workspace.rootPath}/${getConfiguration('filePath')}`
      if (fs.existsSync(filename)) {
        const obj = fs.readJSONSync(filename)
        if (_.get(obj, word)) {
          const keys = _.keys(obj)
          const index = _.findIndex(keys, key => key === word)
          return new vscode.Location(vscode.Uri.file(filename), new vscode.Position(index + 1, 0))
        }
      }
    }
  }))

  /**
   * 悬停提示
   */
  context.subscriptions.push(vscode.languages.registerHoverProvider(['javascript', 'typescript'],
    new (class implements vscode.HoverProvider {
      provideHover(document: vscode.TextDocument, position: vscode.Position) {
        const word = document.getText(document.getWordRangeAtPosition(position))

        const filename = `${vscode.workspace.rootPath}/${getConfiguration('filePath')}`
        if (fs.existsSync(filename)) {
          const obj = fs.readJSONSync(filename)
          const value = _.get(obj, word)
          if (value) {
            const contents = new vscode.MarkdownString(`**[ ${word} ]**: ${value}`);
            return new vscode.Hover(contents);
          }
        }
      }
    })()
  ))

  function init() {
    const activeEditor = window.activeTextEditor
    if (!activeEditor) return;

    const code = activeEditor.document.getText()
    const ast = tsquery.ast(code)
    const nodes = tsquery(ast, 'TaggedTemplateExpression')

    nodes.forEach(node => {
      const start = node.getStart()
      const end = node.getEnd()

      const startPos = activeEditor.document.positionAt(start + 1)
      const endPos = activeEditor.document.positionAt(end)

      taggedTemplateNodesPos.push({
        startLine: startPos.line,
        endLine: endPos.line
      })
    })
  }
}

export function deactivate() { }
