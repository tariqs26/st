import type { FunctionParameter, Stmt } from "backend/ast"
import type Scope from "./scope"

export type RuntimeVal =
  | NumberVal
  | BooleanVal
  | StringVal
  | NullVal
  | ArrayVal
  | ObjectVal
  | FunctionVal
  | TypeVal

export type RuntimeValType = RuntimeVal["type"]

export type NumberVal = {
  type: "number"
  value: number
}

export function mkNumber(n = 0): NumberVal {
  return { type: "number", value: n }
}

export type BooleanVal = {
  type: "boolean"
  value: boolean
}

export function mkBoolean(b = true): BooleanVal {
  return { type: "boolean", value: b }
}

export type StringVal = {
  type: "string"
  value: string
}

export function mkString(str = ""): StringVal {
  return { type: "string", value: str }
}

export type NullVal = {
  type: "null"
  value: null
}

export function mkNull(): NullVal {
  return { type: "null", value: null }
}

export type ArrayVal = {
  type: "array"
  value: RuntimeVal[]
}

export type ObjectVal = {
  type: "object"
  value: Map<string, RuntimeVal>
}

export type FunctionCall = (args: RuntimeVal[], scope: Scope) => RuntimeVal

export type FunctionVal = {
  type: "function"
} & (
  | {
      declarationScope: Scope
      name: string
      parameters: FunctionParameter[]
      body: Stmt[]
    }
  | { call: FunctionCall }
)

export function mkNativeFn(call: FunctionCall): FunctionVal {
  return { type: "function", call }
}

export type TypeVal = {
  type: "type"
  value: RuntimeValType
}

export function mkType(value: RuntimeValType): TypeVal {
  return { type: "type", value }
}
