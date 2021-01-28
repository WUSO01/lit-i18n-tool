/**
 * 一个vscode小插件
 * @author <hi.wuso01@gmail.com>
 */

import * as vscode from 'vscode'
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

    const selection = activeEditor.selection
    const selectedText = activeEditor.document.getText(selection)
    // console.log('selectedText is:', selectedText)
    const filename = `${workspace.rootPath}/${getConfiguration('filePath')}`

    if (fs.existsSync(filename)) {
      const obj = fs.readJSONSync(filename)
      console.log(selectedText + ':' + obj[selectedText])
    }

    // 搜素结果
    const searchList = await searchKey(selectedText)
    console.log('searchList is:', searchList)

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
      let exisss: string[] = []
      const obj = fs.readJSONSync(filename)
      const list = _.keys(obj)
      
      searchList.map(item => {
        if (!list.includes(item)) {
          exisss.push(item)
        }
      })

      exisss = [...new Set(exisss)]

      window.statusBarItem.hide()
      
      showOutput(exisss)
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
    console.log('init...')

    if (!window.outputChannel) {
      window.outputChannel = window.createOutputChannel('Lit-i18n-tools')
    }
  }
}

export function deactivate() { }
