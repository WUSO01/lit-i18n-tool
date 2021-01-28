declare module 'vscode' {
  export namespace window {
    export let outputChannel: any
    export let statusBarItem: any
  }
}

export interface Pos {
  startLine: number
  endLine: number
}