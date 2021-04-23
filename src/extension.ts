/**
 * 一个vscode小插件
 * @author <hi.wuso01@gmail.com>
 */

import * as vscode from 'vscode'
// import { QuickPickItem } from 'vscode'
import * as _ from 'lodash'
import * as fs from 'fs-extra'
import { replaceSelectedContent } from './replaceSelectedContent'
import { generateJson, analysisJson, getConfiguration, showOutput } from './utils'
import { searchKey } from './search'

const { window, workspace } = vscode

export function activate(context: vscode.ExtensionContext) {
  console.log('欢迎使用 Lit-i18n-tool....')

  init()

  /**
   * 根据当前选择的内容生成key
   * 检查是否有当前内容的翻译，或者相似内容的翻译
   * 如果有显示已经翻译的列表
   * 反之直接显示key的输入框
   */
  context.subscriptions.push(vscode.commands.registerTextEditorCommand('lit-i18n-tool.replaceSingle', async () => {
    const activeEditor = window.activeTextEditor
    if (!activeEditor) return

    const selection = activeEditor.selection
    const selectedText = activeEditor.document.getText(selection)

    const list = analysisJson(selectedText)

    if (list?.length) {
      const pickList = list.map(item => {
        return {
          label: item.value,
          description: item.key
        }
      })

      const picked = await window.showQuickPick(pickList, {
        placeHolder: '当前文本已有翻译模版'
      })

      if (picked) return replaceSelectedContent(picked.description)
    }

    // 获取输入的key
    const key: string | undefined = await window.showInputBox({
      prompt: '设置key',
      value: '',
      placeHolder: "请输入key值"
    })

    if (!key) {
      return window.showErrorMessage('key不能为空')
    }

    await generateJson(key, selectedText)
    await replaceSelectedContent(key)

    window.showInformationMessage(`成功替换当前文本`)
  }))

  /**
   * 更新选择的key
   * 检索工作区，看当前key被使用了几次，并列举出来
   * 如果全部替换，直接更新所有key，并修改json文件
   * 否则，只更新选择的key，并在json中新增key
   */
  context.subscriptions.push(vscode.commands.registerTextEditorCommand('lit-i18n-tool.updateKey', async () => {
    const activeEditor = window.activeTextEditor
    if (!activeEditor) return

    /**
     * 对选中文本进行非空判断
     */
    const selection = activeEditor.selection
    const selectedText = activeEditor.document.getText(selection)

    if (!selectedText) {
      return window.showErrorMessage('请选择需要更新的key')
    }

    // 获取json文件
    const filename = `${workspace.rootPath}/${getConfiguration('filePath')}`

    if (!fs.existsSync(filename)) {
      return window.showErrorMessage('JSON文件丢失')
    }

    const data = fs.readJSONSync(filename)
    
    if (!data[selectedText]) {
      return window.showErrorMessage('当前key在JSON文件中不存在')
    }
  
    // 搜素结果
    const searchList = await searchKey(selectedText)

    const pickItems: vscode.QuickPickItem[] = []

    for (let i = 0; i < searchList.length; i++) {
      const { list, uri } = searchList[i]
      for (let j = 0; j < list.length; j++) {
        let obj: vscode.QuickPickItem = {
          label: list[j].lineText,
          description: `${list[j].line}`,
          detail: uri
        }
        pickItems.push(obj)
      }
    }
    
    const picked = await window.showQuickPick(pickItems, {
      placeHolder: '请选择需要更新的key',
      canPickMany: true
    })

    if (!picked) return

    const keyValue = await window.showInputBox({
      prompt: '设置key和value，如：key: value',
      value: '',
    })

    if (!keyValue) {
      return window.showErrorMessage('内容不能为空')
    }

    const [newKey, newVal] = keyValue.split(':')

    if (!newKey || !newVal) {
      return window.showErrorMessage('格式不正确')
    }

    // 先检查newkey是否在json中存在
    if (_.has(data, newKey)) {
      return window.showErrorMessage(`key: \`${newKey}\`重复，请重新命名`)
    }

    const edit = new vscode.WorkspaceEdit()
    picked.map((pick: vscode.QuickPickItem) => {
      const len = selectedText.length
      const line = Number(pick.description) - 1
      const startIndex = pick.label.indexOf(`'${selectedText}'`) + 1

      edit.replace((pick.detail as any), new vscode.Range(line, startIndex, line, startIndex + len + 1), newKey + "'")
    })

    await vscode.workspace.applyEdit(edit)
    generateJson(newKey, newVal)
  }))

  /**
   * @description 有些时候函数中的key在json文件中已经丢失，但是自己却不知道，所以提供一个方法用来检查哪些key已经丢失
   */
  context.subscriptions.push(vscode.commands.registerCommand('lit-i18n-tool.check', async () => {
    window.statusBarItem.text = '搜索中...'
    window.statusBarItem.show()

    const searchList = await searchKey()
    
    if (!searchList.length) return

    // 获取json文件
    const filename = `${workspace.rootPath}/${getConfiguration('filePath')}`
    if (fs.existsSync(filename)) {
      let exisss: any[] = []
    
      const obj = fs.readJSONSync(filename)
      const list = _.keys(obj)
      
      searchList.map(item => {
        item.list.map((i:any) => {
          if (!list.includes(i)) {
            exisss.push({
              uri: item.uri,
              line: item.line,
              key: i
            })
          }
        })
      })

      showOutput(exisss.length)
      exisss.forEach((v: any, i: number) => {
        window.outputChannel.appendLine(`${i}: ${v.uri}   #${v.line}`)
        window.outputChannel.appendLine(`${v.key}`)
        window.outputChannel.appendLine('')
      })
    }
  }))

  /**
   * 跳转
   */
  context.subscriptions.push(vscode.languages.registerDefinitionProvider(['javascript', 'typescript'], {
    provideDefinition: (document, position) => {
      const word = document.getText(document.getWordRangeAtPosition(position))

      const filename = `${workspace.rootPath}/${getConfiguration('filePath')}`
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

        const filename = `${workspace.rootPath}/${getConfiguration('filePath')}`
        if (fs.existsSync(filename)) {
          const obj = fs.readJSONSync(filename)
          const value = _.get(obj, word)
          if (value) {
            const contents = new vscode.MarkdownString(`**[ ${word} ]**: ${value}`)
            return new vscode.Hover(contents)
          }
        }
      }
    })()
  ))

  function init() {
    if (!window.statusBarItem) {
      const statusBarItem = window.createStatusBarItem(vscode.StatusBarAlignment.Left)
      statusBarItem.text = 'xxxxx'
      statusBarItem.tooltip = 'hahahah'
      statusBarItem.command = 'lit-i18n-tool.check'

      window.statusBarItem = statusBarItem
    }

    if (!window.outputChannel) {
      window.outputChannel = window.createOutputChannel('Lit-i18n-tools')
    }
  }
}

export function deactivate() { }
