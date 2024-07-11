import type {
  ArrayLiteral,
  AssignmentExpr,
  BinaryExpr,
  CallExpr,
  Identifier,
  MemberExpr,
  ObjectLiteral,
} from "backend/ast"

import { FunctionReturn, SyntaxError, TypeError } from "utils/errors"
import { evaluate } from "../interpreter"
import Scope from "../scope"

import type {
  ArrayVal,
  BooleanVal,
  NumberVal,
  ObjectVal,
  RuntimeVal,
} from "../values"
import { mkBoolean, mkNull, mkNumber, mkString } from "../values"

function evaluateNumericBinaryExpr(
  left: NumberVal,
  right: NumberVal,
  operator: string
) {
  switch (operator) {
    case "*":
      return left.value * right.value
    case "/":
      return left.value / right.value
    case "//":
      return Math.floor(left.value / right.value)
    case "%":
      return left.value % right.value
    case "+":
      return left.value + right.value
    case "-":
      return left.value - right.value
    case ">":
      return left.value > right.value
    case ">=":
      return left.value >= right.value
    case "<":
      return left.value < right.value
    case "<=":
      return left.value <= right.value
    case "==":
      return left.value === right.value
    case "!=":
      return left.value !== right.value
    default:
      throw new TypeError(`Invalid operator ${operator} for numbers`)
  }
}

function evaluateBooleanBinaryExpr(
  left: BooleanVal,
  right: BooleanVal,
  operator: string
) {
  switch (operator) {
    case "&&":
      return left.value && right.value
    case "||":
      return left.value || right.value
    case "==":
      return left.value === right.value
    case "!=":
      return left.value !== right.value
    default:
      throw new TypeError(`Invalid operator ${operator} for booleans`)
  }
}

export function evaluateBinaryExpr(expr: BinaryExpr, scope: Scope): RuntimeVal {
  const left = evaluate(expr.left, scope)

  const right = evaluate(expr.right, scope)

  if (left.type === "number" && right.type === "number") {
    const evaluatedExpr = evaluateNumericBinaryExpr(left, right, expr.operator)

    return typeof evaluatedExpr === "boolean"
      ? mkBoolean(evaluatedExpr)
      : mkNumber(evaluatedExpr)
  }

  if (left.type === "boolean" && right.type === "boolean")
    return mkBoolean(evaluateBooleanBinaryExpr(left, right, expr.operator))

  return mkNull()
}

export function evaluateIdentifier(
  ident: Identifier,
  scope: Scope
): RuntimeVal {
  return scope.lookupVar(ident.symbol)
}

export function evaluateObjectExpr(
  obj: ObjectLiteral,
  scope: Scope
): RuntimeVal {
  const object = {
    type: "object",
    value: new Map<string, RuntimeVal>(),
  } satisfies ObjectVal

  for (const { key, value } of obj.properties) {
    const runtimeVal =
      value === undefined ? scope.lookupVar(key) : evaluate(value, scope)

    object.value.set(key, runtimeVal)
  }

  return object
}

export function evaluateArrayExpr(arr: ArrayLiteral, scope: Scope): RuntimeVal {
  const array = {
    type: "array",
    value: new Array<RuntimeVal>(),
  } satisfies ArrayVal

  for (const { value } of arr.items) array.value.push(evaluate(value, scope))

  return array
}

export function evalAssignmentExpr(
  node: AssignmentExpr,
  scope: Scope
): RuntimeVal {
  if (
    !(
      node.assignee.kind === "Identifier" || node.assignee.kind === "MemberExpr"
    )
  )
    throw new SyntaxError("Invalid assignment target")

  const value = evaluate(node.value, scope)

  if (node.assignee.kind === "Identifier") {
    const varname = node.assignee.symbol
    return scope.assignVar(varname, value)
  }

  const object = evaluate(node.assignee.object, scope)

  if (!(object.type === "object" || object.type === "array"))
    throw new TypeError(`${object.type} is not assignable`)

  if (node.assignee.computed) {
    const property = evaluate(node.assignee.property, scope)

    if (object.type === "object") {
      if (property.type !== "string")
        throw new TypeError(`expected string, received ${property.type}`)

      object.value.set(property.value, value)
    } else {
      if (property.type !== "number" || !Number.isInteger(property.value))
        throw new TypeError(
          `expected integer, received ${
            property.type === "number" ? "float" : property.type
          }`
        )

      if (property.value > object.value.length)
        throw new TypeError("index out of range")

      object.value[property.value] = value
    }
  } else {
    if (node.assignee.property.kind !== "Identifier")
      throw new TypeError(
        `expected identifier, received ${node.assignee.property.kind}`
      )

    if (object.type !== "object")
      throw new TypeError(`${object.type} is not assignable`)

    object.value.set(node.assignee.property.symbol, value)
  }

  return mkNull()
}

export function evalMemberExpr(expr: MemberExpr, scope: Scope): RuntimeVal {
  const object = evaluate(expr.object, scope)

  const isObjectComputable =
    object.type === "object" ||
    object.type === "array" ||
    object.type === "string"

  if (expr.computed && !isObjectComputable)
    throw new TypeError(`${object.type} is not indexable`)

  if (expr.computed) {
    const property = evaluate(expr.property, scope)

    if (object.type === "array" || object.type === "string") {
      if (property.type !== "number" || !Number.isInteger(property.value))
        throw new TypeError(
          `expected integer, received ${
            property.type === "number" ? "float" : property.type
          }`
        )

      if (object.type === "array") {
        if (property.value < 0 || property.value >= object.value.length)
          return mkNull()
        return object.value[property.value]
      }

      if (property.value < 0 || property.value >= object.value.length)
        return mkNull()
      return mkString(object.value[property.value])
    }

    if (property.type !== "string")
      throw new TypeError(`expected string, received ${property.type}`)

    return (object as ObjectVal).value.get(property.value) ?? mkNull()
  }

  let key: string

  if (expr.property.kind !== "Identifier")
    throw new TypeError(`expected identifier, received ${expr.property.kind}`)

  key = expr.property.symbol

  if (object.type === "object") return object.value.get(key) ?? mkNull()

  const method = scope.getBuiltinProperty(object.type, key)

  if (method === undefined)
    throw new TypeError(`${object.type} has no method ${key}`)

  return method(object)
}

export function evalCallExpr(expr: CallExpr, scope: Scope): RuntimeVal {
  const evaluatedArgs = expr.args.map((arg) => evaluate(arg, scope))

  const fn = evaluate(expr.caller, scope)

  if (fn.type === "function" && "call" in fn)
    return fn.call(evaluatedArgs, scope)

  if (fn.type === "function") {
    const scope = new Scope(fn.declarationScope, "Function")

    const requiredArgs = fn.parameters.filter(
      (param) => param.kind === "Identifier"
    )

    const messageExpected =
      requiredArgs.length !== fn.parameters.length
        ? `${requiredArgs.length}-${fn.parameters.length}`
        : `${requiredArgs.length}`

    if (
      evaluatedArgs.length < requiredArgs.length ||
      evaluatedArgs.length > fn.parameters.length
    )
      throw new SyntaxError(
        `expected ${messageExpected} arguments, received ${evaluatedArgs.length}`
      )

    for (let i = 0; i < fn.parameters.length; i++) {
      const parameter = fn.parameters[i]

      if (parameter.kind === "Identifier")
        scope.declareVar(parameter.symbol, evaluatedArgs[i])
      else {
        if (parameter.assignee.kind !== "Identifier")
          throw new SyntaxError(
            `expected identifier, received ${parameter.assignee.kind}`
          )

        const defaultValue = evaluate(parameter.value, scope)

        if (i > evaluatedArgs.length - 1) {
          scope.declareVar(parameter.assignee.symbol, defaultValue)
          continue
        }

        if (evaluatedArgs[i].type !== defaultValue.type)
          throw new TypeError(
            `expected ${defaultValue.type}, received ${evaluatedArgs[i].type}`
          )

        scope.declareVar(parameter.assignee.symbol, evaluatedArgs[i])
      }
    }

    for (let i = 0; i < fn.body.length; i++) {
      try {
        evaluate(fn.body[i], scope)
      } catch (error) {
        if (error instanceof FunctionReturn) return error.value
        throw error
      }
    }

    return mkNull()
  }

  throw new TypeError(`${fn.type} is not callable`)
}
