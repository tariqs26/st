import { ReferenceError, SyntaxError, TypeError } from "utils/errors"
import type { RuntimeVal, RuntimeValType } from "./values"

type ScopeType = "Global" | "ControlFlow" | "Loop" | "Function"

export default class Scope {
  private builtinProperties: Map<
    RuntimeValType,
    Record<string, (object: any) => RuntimeVal>
  > = new Map()
  private variables: Map<string, RuntimeVal> = new Map()
  private constants: Set<string> = new Set()

  constructor(public parent?: Scope, public scopeType: ScopeType = "Global") {
    this.parent = parent
    this.scopeType = scopeType
  }

  declareBuiltin(
    type: RuntimeValType,
    property: Record<string, (object: any) => RuntimeVal>
  ) {
    this.builtinProperties.set(type, property)
  }

  getBuiltinProperty(type: RuntimeValType, property: string) {
    return this.builtinProperties.get(type)?.[property]
  }

  declareVar(varname: string, value: RuntimeVal, constant = false) {
    if (this.variables.has(varname))
      throw new SyntaxError(`identifier "${varname}" has already been declared`)
    this.variables.set(varname, value)

    if (constant) this.constants.add(varname)

    return value
  }

  assignVar(varname: string, value: RuntimeVal) {
    const scope = this.resolve(varname)
    if (scope.constants.has(varname))
      throw new TypeError(`invalid assignment to const "${varname}"`)
    scope.variables.set(varname, value)
    return value
  }

  lookupVar(varname: string) {
    const scope = this.resolve(varname)
    return scope.variables.get(varname) as RuntimeVal
  }

  resolve(varname: string): Scope {
    if (this.variables.has(varname)) return this

    if (this.parent === undefined)
      throw new ReferenceError(`"${varname}" is not defined`)

    return this.parent.resolve(varname)
  }
}
