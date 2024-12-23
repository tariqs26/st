import type { Stmt } from "../backend/ast"
import Parser from "../backend/parser"

import { InternalError } from "../utils/errors"
import { createGlobalScope } from "../utils/scope"

import * as expr from "./eval/expressions"
import * as stmt from "./eval/statements"

import type Scope from "./scope"
import {
  type RuntimeVal,
  mkBoolean,
  mkNull,
  mkNumber,
  mkString,
} from "./values"

export function evaluate(astNode: Stmt, scope: Scope): RuntimeVal {
  switch (astNode.kind) {
    case "Identifier":
      return expr.evalIdentifier(astNode, scope)
    case "NumericLiteral":
      return mkNumber(astNode.value)
    case "StringLiteral":
      return mkString(astNode.value)
    case "BooleanLiteral":
      return mkBoolean(astNode.value)
    case "NullLiteral":
      return mkNull()
    case "ArrayLiteral":
      return expr.evalArrayExpr(astNode, scope)
    case "ObjectLiteral":
      return expr.evalObjectExpr(astNode, scope)
    case "BinaryExpr":
      return expr.evalBinaryExpr(astNode, scope)
    case "UnaryExpr":
      return expr.evalUnaryExpr(astNode, scope)
    case "AssignmentExpr":
      return expr.evalAssignmentExpr(astNode, scope)
    case "MemberExpr":
      return expr.evalMemberExpr(astNode, scope)
    case "CallExpr":
      return expr.evalCallExpr(astNode, scope)
    case "Program":
      return stmt.evalProgram(astNode, scope)
    case "VarDeclaration":
      return stmt.evalVarDeclaration(astNode, scope)
    case "ControlFlow":
      return stmt.evalControlFlow(astNode, scope)
    case "ForLoop":
      return stmt.evalForLoop(astNode, scope)
    case "WhileLoop":
      return stmt.evalWhileLoop(astNode, scope)
    case "Break":
    case "Continue":
      return stmt.evalBreakContinue(astNode, scope)
    case "FunctionDeclaration":
      return stmt.evalFunctionDeclaration(astNode, scope)
    case "Return":
      return stmt.evalReturn(astNode, scope)
    default:
      throw new InternalError(
        `AST Node cannot yet be interpreted \n${JSON.stringify(
          astNode,
          null,
          2
        )}`
      )
  }
}

export default class Interpreter {
  private parser = new Parser()
  private scope = createGlobalScope()

  run(src: string, isRepl = false) {
    const program = this.parser.produceAST(src)
    const result = evaluate(program, this.scope)
    if (isRepl) console.log(result)
  }
}
