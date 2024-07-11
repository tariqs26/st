import Scope from "runtime/scope"
import type { ArrayVal, RuntimeVal, StringVal } from "runtime/values"
import {
  mkBoolean,
  mkNativeFn,
  mkNull,
  mkNumber,
  mkString,
  mkType,
} from "runtime/values"
import { SyntaxError, TypeError } from "utils/errors"

export function formatRuntimeVal(val: RuntimeVal): any {
  switch (val.type) {
    case "array":
      return val.value.map(formatRuntimeVal)
    default:
      return "value" in val ? val.value : val
  }
}

function validateArgCount(args: RuntimeVal[], min: number, max: number) {
  const argCount = args.length
  if (argCount < min || argCount > max) {
    const expectedMessage = min === max ? `${min}` : `${min}-${max}`
    throw new SyntaxError(
      `expected ${expectedMessage} arguments, received ${argCount}`
    )
  }
}

export function createGlobalScope() {
  const scope = new Scope()

  scope.declareBuiltin("string", {
    length: (object: StringVal) => mkNumber(object.value.length),
    concat: (object: StringVal) =>
      mkNativeFn((args: RuntimeVal[]) => {
        validateArgCount(args, 1, 1)
        if (args[0].type !== "string")
          throw new TypeError("argument must be a string")
        return mkString(object.value + args[0].value)
      }),
  })

  scope.declareBuiltin("array", {
    length: (object: ArrayVal) => mkNumber(object.value.length),
    pop: (object: ArrayVal) =>
      mkNativeFn((_: RuntimeVal[]) => object.value.pop() ?? mkNull()),
    push: (object: ArrayVal) =>
      mkNativeFn((args: RuntimeVal[]) => {
        object.value.push(...args)
        return mkNull()
      }),
  })

  scope.declareVar(
    "print",
    mkNativeFn((args: RuntimeVal[]) => {
      console.log(...args.map(formatRuntimeVal))
      return mkNull()
    }),
    true
  )

  scope.declareVar(
    "input",
    mkNativeFn((args: RuntimeVal[]) => {
      validateArgCount(args, 0, 1)
      let message = ""

      if (args.length === 1) {
        if (args[0].type !== "string")
          throw new TypeError("argument must be a string")
        message = args[0].value
      }

      const input = prompt(message ?? "")
      if (input === null) return mkNull()
      return mkString(input)
    }),
    true
  )

  scope.declareVar(
    "typeof",
    mkNativeFn((args: RuntimeVal[]) => {
      if (args.length > 1 || args.length === 0) {
        throw new SyntaxError(`expected 1 argument received ${args.length}`)
      }
      return mkType(args[0].type)
    }),
    true
  )

  scope.declareVar(
    "random",
    mkNativeFn((args: RuntimeVal[]) => {
      validateArgCount(args, 0, 2)
      switch (args.length) {
        case 2: {
          if (args[0].type !== "number" || args[1].type !== "number")
            throw new TypeError("arguments must be numbers")
          const min = args[0].value
          const max = args[1].value
          return mkNumber(Math.floor(Math.random() * (max - min + 1)) + min)
        }
        default:
          return mkNumber(Math.random())
      }
    }),
    true
  )

  scope.declareVar(
    "pow",
    mkNativeFn((args: RuntimeVal[]) => {
      if (args.length !== 2)
        throw new SyntaxError(`expected 2 arguments received ${args.length}`)

      if (args[0].type !== "number" || args[1].type !== "number")
        throw new TypeError("arguments must be numbers")

      return mkNumber(args[0].value ** args[1].value)
    }),
    true
  )

  scope.declareVar(
    "bool",
    mkNativeFn((args: RuntimeVal[]) => {
      if (args.length !== 1)
        throw new SyntaxError(`expected 1 argument received ${args.length}`)

      if (args[0].type === "function")
        throw new TypeError("cannot convert function to boolean")

      return mkBoolean(
        Boolean(
          args[0].type === "object"
            ? args[0].value.size
            : args[0].type === "array"
            ? args[0].value.length
            : args[0].value
        )
      )
    })
  )

  return scope
}
