import * as vscode from 'vscode'
import { tsquery } from '@phenomnomnominal/tsquery'
import { getConfiguration } from './utils'
import { Pos } from './typing'

const { window } = vscode

/**
 * 替换选择的文本
 * @param key 输入的key
 * @params taggedTemplateNodesPos
 * 
 * 目前考虑的两种情况：
 * [模版字符串]：
 * 
 * render() {
 *   return html`
 *     <div>张三</div>     ----> <div>${i18n('name')}</div>
 *   `
 * }
 * 
 * [普通函数|对象]:
 * 
 * const obj = {
 *   name: 张三    ----> name: i18n('name')
 * }
 */
export async function replaceSelectedContent(key: string) {
  const taggedTemplateNodesPos: Pos[] = []

  const activeEditor = window.activeTextEditor
  if (!activeEditor) return

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

  const selection = activeEditor.selection
  const { start, end } = selection

  const document = activeEditor.document
  const edit = new vscode.WorkspaceEdit()

  // 获取函数名字
  const fn = getConfiguration('func')

  let isIntemplate = false
  let len = taggedTemplateNodesPos.length

  if (len) {
    for (let i = 0; i < len; i++) {
      const { startLine, endLine } = taggedTemplateNodesPos[i]
      if (start.line > startLine && end.line < endLine) {
        isIntemplate = true
        break
      }
    }
  }

  if (isIntemplate) {
    edit.replace(document.uri, new vscode.Range(start, end), `\$\{${fn}('${key}')\}`)
  } else {
    // 需要把引号移除掉
    edit.replace(document.uri, new vscode.Range(start.line, start.character - 1, end.line, end.character + 1), `${fn}('${key}')`)
  }

  // 更新编辑器
  await vscode.workspace.applyEdit(edit)
}
