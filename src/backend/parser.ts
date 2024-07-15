import type ProgramError from "../utils/errors"
import { InternalError, SyntaxError } from "../utils/errors"
import type {
  ArrayItem,
  Expr,
  FunctionParameter,
  Program,
  Property,
  Return,
  Stmt,
  VarDeclaration,
} from "./ast"
import Lexer from "./lexer"
import { TokenType, type Token } from "./tokens"

export default class Parser {
  private tokens: Token[] = []

  private get EOF() {
    return this.tokens[0].type === TokenType.EOF
  }

  private curr() {
    return this.tokens[0]
  }

  private next() {
    const nextToken = this.tokens.shift()
    if (nextToken === undefined)
      throw new InternalError("unexpected end of input")
    
    return nextToken
  }

  private expect(type: TokenType, error: ProgramError) {
    const prev = this.next()
    if (prev === undefined || prev.type !== type) throw error
    return prev
  }

  private parsePrimaryExpr(): Expr {
    const tk = this.curr().type

    switch (tk) {
      case TokenType.Ident:
        return { kind: "Identifier", symbol: this.next().value }
      case TokenType.Number:
        return { kind: "NumericLiteral", value: +this.next().value }
      case TokenType.True:
      case TokenType.False:
        return { kind: "BooleanLiteral", value: this.next().value === "true" }
      case TokenType.Null: {
        this.next()
        return { kind: "NullLiteral", value: null }
      }
      case TokenType.String:
        return { kind: "StringLiteral", value: this.next().value }
      case TokenType.OpenParen: {
        this.next()
        const value = this.parseExpr()
        this.expect(
          TokenType.CloseParen,
          new SyntaxError("missing closing parenthesis")
        )

        return value
      }
      default:
        throw new InternalError(`Unexpected token '${this.curr().value}'`)
    }
  }

  private parseMemberExpr(): Expr {
    let object = this.parsePrimaryExpr()

    while (
      this.curr().type === TokenType.Dot ||
      this.curr().type === TokenType.OpenBracket
    ) {
      const operator = this.next()

      let property: Expr
      let computed: boolean

      // non-computed foo.bar
      if (operator.type === TokenType.Dot) {
        computed = false
        // get ident
        property = this.parsePrimaryExpr()

        if (property.kind !== "Identifier")
          throw new SyntaxError("expected identifier after .")
      } else {
        // allow obj[computedValue]
        computed = true
        property = this.parseExpr()
        this.expect(TokenType.CloseBracket, new SyntaxError("missing ]"))
      }

      object = {
        kind: "MemberExpr",
        object,
        property,
        computed,
      }
    }

    return object
  }

  // <foo.x>()() parse left fully
  private parseCallMemberExpr() {
    const member = this.parseMemberExpr()
    if (this.curr().type === TokenType.OpenParen)
      return this.parseCallExpr(member)

    return member
  }

  private parseCallExpr(caller: Expr): Expr {
    let callExpr: Expr = {
      kind: "CallExpr",
      caller,
      args: this.parseArgs(),
    }

    // foo()()
    if (this.curr().type === TokenType.OpenParen)
      callExpr = this.parseCallExpr(callExpr)

    return callExpr
  }

  // add(x + 5, y)
  private parseArgs(isDeclaration = false): Expr[] {
    const stmtType = isDeclaration ? "declaration" : "call"
    this.expect(
      TokenType.OpenParen,
      new SyntaxError(`missing ( in function ${stmtType}`)
    )

    const args =
      this.curr().type === TokenType.CloseParen ? [] : this.parseArgsList()

    this.expect(
      TokenType.CloseParen,
      new SyntaxError(`missing ) in function ${stmtType}`)
    )

    return args
  }

  // foo(x= 5, v=5)
  private parseArgsList(): Expr[] {
    const args = [this.parseAssignmentExpr()]
    while (this.curr().type === TokenType.Comma && this.next())
      args.push(this.parseAssignmentExpr())

    return args
  }

  private parseUnaryExpr(): Expr {
    if (this.curr().type === TokenType.UnaryOp) {
      const operator = this.next().value
      const operand = this.parseUnaryExpr()
      return { kind: "UnaryExpr", operator, operand }
    }

    return this.parseCallMemberExpr()
  }

  private parseMultiplicativeExpr(): Expr {
    let left = this.parseUnaryExpr()

    while (["/", "//", "*", "**", "%"].includes(this.curr().value)) {
      const operator = this.next().value
      const right = this.parseUnaryExpr()
      left = {
        kind: "BinaryExpr",
        left,
        right,
        operator,
      }
    }

    return left
  }

  private parseAdditiveExpr(): Expr {
    let left = this.parseMultiplicativeExpr()

    while (["+", "-"].includes(this.curr().value)) {
      const operator = this.next().value
      const right = this.parseMultiplicativeExpr()
      left = {
        kind: "BinaryExpr",
        left,
        right,
        operator,
      }
    }

    return left
  }

  private parseRelationalExpr(): Expr {
    let left = this.parseAdditiveExpr()

    while (["<", "<=", ">", ">="].includes(this.curr().value)) {
      const operator = this.next().value
      const right = this.parseAdditiveExpr()
      left = {
        kind: "BinaryExpr",
        left,
        right,
        operator,
      }
    }

    return left
  }

  private parseEqualityExpr(): Expr {
    let left = this.parseRelationalExpr()

    while (["==", "!="].includes(this.curr().value)) {
      const operator = this.next().value
      const right = this.parseRelationalExpr()
      left = {
        kind: "BinaryExpr",
        left,
        right,
        operator,
      }
    }

    return left
  }

  private parseAndExpr(): Expr {
    let left = this.parseEqualityExpr()

    while (this.curr().value === "&&") {
      const operator = this.next().value
      const right = this.parseEqualityExpr()
      left = {
        kind: "BinaryExpr",
        left,
        right,
        operator,
      }
    }

    return left
  }

  private parseOrExpr(): Expr {
    let left = this.parseAndExpr()

    while (this.curr().value === "||") {
      const operator = this.next().value
      const right = this.parseAndExpr()
      left = {
        kind: "BinaryExpr",
        left,
        right,
        operator,
      }
    }

    return left
  }

  private parseArrayExpr(): Expr {
    if (this.curr().type !== TokenType.OpenBracket) return this.parseOrExpr()

    this.next()

    const items = new Array<ArrayItem>()

    let index = 0

    while (!this.EOF && this.curr().type !== TokenType.CloseBracket) {
      const value = this.parseExpr()

      if (this.EOF) throw new SyntaxError("missing ]")

      items.push({
        kind: "ArrayItem",
        value,
        index: index++,
      })

      if (this.curr().type === TokenType.Comma) this.next()
    }

    this.expect(TokenType.CloseBracket, new SyntaxError("missing ]"))

    return { kind: "ArrayLiteral", items }
  }

  private parseObjectExpr(): Expr {
    if (this.curr().type !== TokenType.OpenBrace) return this.parseArrayExpr()

    this.next()

    const properties = new Array<Property>()

    while (!this.EOF && this.curr().type !== TokenType.CloseBrace) {
      // {key: value, key2: value2}
      // {key,...}

      const key = this.expect(
        TokenType.Ident,
        new SyntaxError("missing key in object literal")
      ).value

      // { key,
      if (this.curr().type === TokenType.Comma) {
        this.next()
        properties.push({ key })
        continue
      }

      // { key }
      if (this.curr().type === TokenType.CloseBrace) {
        properties.push({ key })
        continue
      }

      // {key: val,}
      this.expect(
        TokenType.Colon,
        new SyntaxError("missing : in object literal")
      )

      const value = this.parseExpr()

      properties.push({ key, value })

      if (this.curr().type !== TokenType.CloseBrace) {
        this.expect(
          TokenType.Comma,
          new SyntaxError("missing , in object literal")
        )
      }
    }

    this.expect(
      TokenType.CloseBrace,
      new SyntaxError("missing } in object literal")
    )

    return { kind: "ObjectLiteral", properties }
  }

  private parseAssignmentExpr(): Expr {
    const left = this.parseObjectExpr()

    if (this.curr().type === TokenType.Equals) {
      this.next()
      const value = this.parseAssignmentExpr()
      return { kind: "AssignmentExpr", value, assignee: left }
    }

    return left
  }

  private parseExpr() {
    return this.parseAssignmentExpr()
  }

  private parseBody(): Stmt[] {
    const body = new Array<Stmt>()

    while (!this.EOF && this.curr().type !== TokenType.CloseBrace)
      body.push(this.parseStmt())

    return body
  }

  private parseVarDeclaration(): VarDeclaration {
    const constant = this.next().type === TokenType.Const

    const ident = this.expect(
      TokenType.Ident,
      new SyntaxError("missing identifier in variable declaration")
    ).value

    if (this.EOF) {
      if (constant)
        throw new SyntaxError("missing value in constant declaration")
      return { kind: "VarDeclaration", constant, ident }
    }

    this.expect(
      TokenType.Equals,
      new SyntaxError("missing = in variable initialization")
    )

    if (this.EOF)
      throw new SyntaxError("missing value in variable initialization")

    return {
      kind: "VarDeclaration",
      constant,
      ident,
      value: this.parseExpr(),
    }
  }

  private parseControlFlow() {
    this.next()

    if (this.EOF) throw new SyntaxError("missing condition")

    const condition = this.parseExpr()

    this.expect(TokenType.OpenBrace, new SyntaxError("missing {"))

    const declaration: Stmt = {
      kind: "ControlFlow",
      condition,
      body: this.parseBody(),
    }

    this.expect(TokenType.CloseBrace, new SyntaxError("missing }"))

    if (this.EOF || this.curr().type !== TokenType.Else) return declaration

    this.next()

    this.expect(TokenType.OpenBrace, new SyntaxError("missing {"))

    declaration.elseBody = this.parseBody()

    this.expect(TokenType.CloseBrace, new SyntaxError("missing }"))

    return declaration
  }

  private parseForLoop() {
    this.next()

    this.expect(TokenType.OpenParen, new SyntaxError("missing ("))

    if (this.EOF) throw new SyntaxError("missing init")

    const init = this.parseVarDeclaration()

    if (this.EOF) throw new SyntaxError("missing condition")

    this.expect(
      TokenType.SemiColon,
      new SyntaxError("missing ; after for loop init")
    )

    const condition = this.parseExpr()

    if (this.EOF) throw new SyntaxError("missing update")

    this.expect(
      TokenType.SemiColon,
      new SyntaxError("missing ; after for loop condition")
    )

    const update = this.parseExpr()

    if (this.EOF) throw new SyntaxError("missing )")

    this.expect(TokenType.CloseParen, new SyntaxError("missing )"))

    this.expect(TokenType.OpenBrace, new SyntaxError("missing {"))

    const declaration: Stmt = {
      kind: "ForLoop",
      init,
      condition,
      update,
      body: this.parseBody(),
    }

    this.expect(TokenType.CloseBrace, new SyntaxError("missing }"))

    return declaration
  }

  private parseWhileLoop() {
    this.next()

    if (this.EOF) throw new SyntaxError("missing condition")
    const condition = this.parseExpr()

    this.expect(TokenType.OpenBrace, new SyntaxError("missing {"))

    const declaration: Stmt = {
      kind: "WhileLoop",
      condition,
      body: this.parseBody(),
    }

    this.expect(TokenType.CloseBrace, new SyntaxError("missing }"))

    return declaration
  }

  private parseFunctionDeclaration() {
    this.next()
    const name = this.expect(
      TokenType.Ident,
      new SyntaxError("missing function name")
    ).value

    const params = this.parseArgs(true)
    const parameters = new Array<FunctionParameter>()

    for (const param of params) {
      if (param.kind === "AssignmentExpr" || param.kind === "Identifier")
        parameters.push(param)
      else throw new SyntaxError("expected identifier in parameter list")
    }

    if (parameters.length > 0) {
      let firstOptional: number | undefined
      let lastRequired: number | undefined

      for (let i = 0; i < parameters.length; i++) {
        if (
          parameters[i].kind === "AssignmentExpr" &&
          firstOptional === undefined
        )
          firstOptional = i
        else lastRequired = i
      }

      if (
        firstOptional !== undefined &&
        lastRequired !== undefined &&
        firstOptional < lastRequired
      )
        throw new SyntaxError(
          "required parameters cannot follow optional parameters"
        )
    }

    this.expect(TokenType.OpenBrace, new SyntaxError("missing {"))

    const declaration: Stmt = {
      kind: "FunctionDeclaration",
      name,
      parameters,
      body: this.parseBody(),
    }

    this.expect(TokenType.CloseBrace, new SyntaxError("missing }"))

    return declaration
  }

  private parseReturn(): Return {
    this.next()

    if (this.EOF) return { kind: "Return" }

    const declaration: Return = {
      kind: "Return",
      value: this.parseExpr(),
    }

    return declaration
  }

  private parseStmt(): Stmt {
    switch (this.curr().type) {
      case TokenType.Let:
      case TokenType.Const:
        return this.parseVarDeclaration()
      case TokenType.If:
        return this.parseControlFlow()
      case TokenType.For:
        return this.parseForLoop()
      case TokenType.While:
        return this.parseWhileLoop()
      case TokenType.Break:
      case TokenType.Continue:
        return this.next().type === TokenType.Break
          ? { kind: "Break" }
          : { kind: "Continue" }
      case TokenType.Function:
        return this.parseFunctionDeclaration()
      case TokenType.Return:
        return this.parseReturn()
    }

    return this.parseExpr()
  }

  produceAST(src: string) {
    const lexer = new Lexer()
    this.tokens = lexer.tokenize(src)

    const program: Program = {
      kind: "Program",
      body: [],
    }

    while (!this.EOF) program.body.push(this.parseStmt())

    return program
  }
}
