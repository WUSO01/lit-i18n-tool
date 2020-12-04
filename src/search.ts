/**
 * 搜索
 */
import * as vscode from 'vscode'
import { getConfiguration } from './utils'

export async function searchKey(key: string) {
  const files = await vscode.workspace.findFiles('**/*.{js,ts}', '/node_modules')

  const list: any[] = []

  for (let i = 0; i < files.length; i++) {
    const file = await vscode.workspace.openTextDocument(files[i])
    searchKeyInFile(file, key, list)
  }

  return Promise.resolve(list)
}

function searchKeyInFile<T extends any[]>(file: vscode.TextDocument, key: string, list: T) {
  const fn = getConfiguration('func') as string
  const filePath = file.uri.path

  for (let line = 0; line < file.lineCount; line++) {
    // 获取每一行文本
    const lineText = file.lineAt(line).text
    if (lineText.includes(`${fn}('${key}')`)) {
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
  }
}
