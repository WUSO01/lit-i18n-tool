/**
 * 搜索
 */
import * as vscode from 'vscode'
import { getConfiguration } from './utils'

export async function searchKey(key?: string) {
  const include = getConfiguration('include').join(',')
  const exclude = getConfiguration('exclude').join(',')

  const files = await vscode.workspace.findFiles(`**/*.{${include}}`, `**/{${exclude}}`)

  const list: any[] = []

  for (let i = 0; i < files.length; i++) {
    const file = await vscode.workspace.openTextDocument(files[i])
    searchKeyInFile(file, list, key)
  }

  return Promise.resolve(list)
}

/**
 * 在文件中搜索字段
 */
function searchKeyInFile<T extends any[]>(file: vscode.TextDocument, list: T, key?: string) {
  const fn = getConfiguration('func') as string
  const filePath = file.uri.path

  for (let line = 0; line < file.lineCount; line++) {
    // 获取每一行文本
    const lineText = file.lineAt(line).text

    if (key) {
      if (lineText.includes(`${fn}('${key}')`)) { // 查找指定的key
        const startCol = lineText.indexOf(`${fn}('${key}')`) + fn.length + 2
        const endCol = startCol + key.length
        const range = new vscode.Range(line, startCol + 1, line, endCol)
        list.push({
          uri: filePath,
          list: [
            {
              lineText: lineText.trim(),
              range,
              line: line + 1
            }
          ]
        })
      }
    } else {  // 查找所有的key
      // str.match(/(?<=i18n\(').+?(?=')/gi)
      // TODO 函数名使用变量
      const result = lineText.match(/(?<=i18n\(').+?(?=')/gi)
      if (result?.length) {
        // list.push(...result)
        list.push({
          uri: filePath,
          list: [...result],
          line: line + 1
        })
      }
    }
  }
}
