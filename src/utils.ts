/**
 * 实用方法
 */
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as _ from 'lodash';

const { workspace } = vscode;

/**
 * 获取插件配置
 */
export const getConfiguration = (key: string) => {
  let value = workspace.getConfiguration('lit-i18n-tool').get(key);
  return value;
};

/**
 * 翻译JSON文件
 * 可以用来追踪当前替换的key对应的中文（比如：自己忘记当前的key的中文，或者看别人修改的key）
 */
export function generateJson(key: string, value: string) {
  return new Promise((resolve, reject) => {
    const filePath = getConfiguration('filePath')
    const filename = `${vscode.workspace.rootPath}/${filePath}`
    if (!fs.existsSync(filename)) {
      const obj = _.set({}, key, value)
      fs.outputFile(filename, JSON.stringify(obj, null, 2) + os.EOL, () => {
        resolve()
      })
    } else {
      const originContent = fs.readJSONSync(filename)
      const obj = originContent

      // 判断key是否重复
      if (_.get(obj, key) !== undefined) {
        vscode.window.showErrorMessage(`key: \`${key}\`重复，请重新命名`)
        reject('key重复')
      }
      _.set(obj, key, value)
      fs.writeFile(filename, JSON.stringify(obj, null, 2) + os.EOL, () => resolve())
    }
  })
}

/**
 * 检查JSON文件
 */
export function analysisJson(val: string) {
  const filePath = getConfiguration('filePath')
  const filename = `${vscode.workspace.rootPath}/${filePath}`

  if (fs.existsSync(filename)) {
    const obj = fs.readJSONSync(filename)
    const list = _.keys(obj)
      .map(key => {
        return {
          key,
          value: _.get(obj, key)
        }
      })
      .filter(item => item.value.includes(val))
    return list
  }
}