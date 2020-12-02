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
 * 生成JSON文件
 * 用来追踪当前替换的key对应的中文（比如：自己忘记当前的key的中文，或者看别人修改的key）
 * {
 *  key: value
 * }
 */
export function generateJson(key: string, value: string) {
  const name = getConfiguration('backupFile')
  const filename = `${vscode.workspace.rootPath}/${name}.json`

  if (!fs.existsSync(filename)) {
    const obj = _.set({}, key, value)
    fs.outputFileSync(filename, JSON.stringify(obj, null, 2) + os.EOL)
  } else {
    const originContent = fs.readJSONSync(filename)
    const obj = originContent

    // 判断key是否重复
    if (_.get(obj, key) !== undefined) {
      vscode.window.showErrorMessage(`key: \`${key}\`重复，请重新命名`)
      throw new Error('key重复')
    }
    _.set(obj, key, value)
    fs.writeFileSync(filename, JSON.stringify(obj, null, 2) + os.EOL)
  }
}
