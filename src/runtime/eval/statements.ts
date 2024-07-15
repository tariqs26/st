import type {
  BreakStmt,
  ContinueStmt,
  ControlFlow,
  ForLoop,
  FunctionDeclaration,
  Program,
  Return,
  VarDeclaration,
  WhileLoop,
} from "../../backend/ast"

import {
  Break,
  Continue,
  FunctionReturn,
  SyntaxError,
  TypeError,
} from "../../utils/errors"

import { evaluate } from "../interpreter"
import Scope from "../scope"
import { type FunctionVal, type RuntimeVal, mkNull } from "../values"

export function evaluateProgram(program: Program, scope: Scope): RuntimeVal {
  let lastEvaluated: RuntimeVal = mkNull()

  for (const statement of program.body)
    lastEvaluated = evaluate(statement, scope)

  return lastEvaluated
}

export function evaluateVarDeclaration(
  declaration: VarDeclaration,
  scope: Scope
): RuntimeVal {
  const value = declaration.value
    ? evaluate(declaration.value, scope)
    : mkNull()
  return scope.declareVar(declaration.ident, value, declaration.constant)
}

export function evaluateControlFlow(
  declaration: ControlFlow,
  declarationScope: Scope
): RuntimeVal {
  const condition = evaluate(declaration.condition, declarationScope)

  if (condition.type !== "boolean")
    throw new TypeError("expected boolean expression")

  const scope = new Scope(declarationScope, "ControlFlow")

  for (const statement of condition.value
    ? declaration.body
    : declaration.elseBody !== undefined
    ? declaration.elseBody
    : [])
    evaluate(statement, scope)

  return mkNull()
}

export function evaluateForLoop(
  declaration: ForLoop,
  declarationScope: Scope
): RuntimeVal {
  const scope = new Scope(declarationScope, "Loop")

  evaluate(declaration.init, scope)

  outer: while (true) {
    const condition = evaluate(declaration.condition, scope)

    if (condition.type !== "boolean")
      throw new TypeError("Expected boolean expression")

    if (!condition.value) break

    const innerScope = new Scope(scope, "Loop")

    for (const statement of declaration.body) {
      try {
        evaluate(statement, innerScope)
      } catch (error) {
        if (error instanceof Break) break outer
        if (error instanceof Continue) continue outer
        throw error
      }
    }

    evaluate(declaration.update, scope)
  }

  return mkNull()
}

export function evaluateWhileLoop(
  declaration: WhileLoop,
  declarationScope: Scope
): RuntimeVal {
  let scope = new Scope(declarationScope, "Loop")

  const checkCondition = () => {
    const condition = evaluate(declaration.condition, scope)

    if (condition.type !== "boolean")
      throw new TypeError("expected boolean expression")

    scope = new Scope(declarationScope, "Loop")

    return condition.value
  }

  outer: while (checkCondition())
    for (const statement of declaration.body)
      try {
        evaluate(statement, scope)
      } catch (error) {
        if (error instanceof Break) break outer
        if (error instanceof Continue) continue outer
        throw error
      }

  return mkNull()
}

export function evaluateBreakContinue(
  declaration: BreakStmt | ContinueStmt,
  scope: Scope
): RuntimeVal {
  while (scope.scopeType !== "Loop" && scope.parent !== undefined)
    if (scope.scopeType === "Function" || scope.scopeType === "Global")
      throw new SyntaxError("break/continue statement outside of loop")
    else scope = scope.parent

  if (scope.scopeType !== "Loop")
    throw new SyntaxError("break/continue statement outside of loop")

  if (declaration.kind === "Break") throw new Break()
  throw new Continue()
}

export function evaluateFunctionDeclaration(
  declaration: FunctionDeclaration,
  scope: Scope
): RuntimeVal {
  const fn = {
    type: "function",
    ...declaration,
    declarationScope: scope,
  } satisfies FunctionVal

  return scope.declareVar(declaration.name, fn, true)
}

export function evaluateReturn(declaration: Return, scope: Scope): RuntimeVal {
  while (scope.scopeType !== "Function" && scope.parent !== undefined)
    scope = scope.parent

  if (scope === undefined || scope.scopeType !== "Function")
    throw new SyntaxError("return statement outside of function")

  throw new FunctionReturn(
    declaration.value ? evaluate(declaration.value, scope) : mkNull()
  )
}
