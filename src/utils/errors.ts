import type { RuntimeVal } from "../runtime/values"

export class ProgramError extends Error {
  constructor(errorType: string, description: string) {
    super(`${errorType}: ${description}`)
  }
}

export class InternalError extends ProgramError {
  constructor(description: string) {
    super("InternalError", description)
  }
}

export class SyntaxError extends ProgramError {
  constructor(description: string) {
    super("SyntaxError", description)
  }
}

export class TypeError extends ProgramError {
  constructor(description: string) {
    super("TypeError", description)
  }
}

export class ReferenceError extends ProgramError {
  constructor(description: string) {
    super("ReferenceError", description)
  }
}

export class FunctionReturn extends ProgramError {
  constructor(public value: RuntimeVal) {
    super("FunctionReturn", "Function return")
    this.value = value
  }
}

export class BreakStmt extends ProgramError {
  constructor() {
    super("Break", "Break statement")
  }
}

export class ContinueStmt extends ProgramError {
  constructor() {
    super("Continue", "Continue statement")
  }
}
