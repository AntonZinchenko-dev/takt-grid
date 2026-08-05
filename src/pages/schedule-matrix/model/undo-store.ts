import { makeAutoObservable } from 'mobx'

export interface UndoCommand {
  label: string
  undo: () => Promise<void>
  redo: () => Promise<void>
}

const MAX_HISTORY = 20

/**
 * Стек истории действий матрицы планирования — отдельный от GridStore класс (тот держит
 * только эфемерное UI-состояние грида, без данных и без side-эффектов), тот же MobX-идиом.
 * Мутации assignments в проекте не оптимистичные (invalidate-on-success, без патча кэша),
 * поэтому undo/redo — это снятый на клиенте "до"-снимок и повторный вызов той же мутации
 * в обратную сторону, а не откат локального кэша.
 */
export class UndoStore {
  past: UndoCommand[] = []
  future: UndoCommand[] = []
  pending = false

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true })
  }

  get canUndo(): boolean {
    return this.past.length > 0 && !this.pending
  }

  get canRedo(): boolean {
    return this.future.length > 0 && !this.pending
  }

  push(command: UndoCommand): void {
    this.past.push(command)
    if (this.past.length > MAX_HISTORY) this.past.shift()
    this.future = []
  }

  async undo(): Promise<string | undefined> {
    const command = this.past.pop()
    if (!command) return undefined
    this.pending = true
    try {
      await command.undo()
      this.future.push(command)
      return command.label
    } finally {
      this.pending = false
    }
  }

  async redo(): Promise<string | undefined> {
    const command = this.future.pop()
    if (!command) return undefined
    this.pending = true
    try {
      await command.redo()
      this.past.push(command)
      return command.label
    } finally {
      this.pending = false
    }
  }
}
