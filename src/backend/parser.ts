import { InternalError, type ProgramError, SyntaxError } from "@/utils/errors"
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
import { Lexer } from "./lexer"
import { TOKENS, type Token, type TokenType } from "./tokens"

export class Parser {
  private tokens: Token[] = []

  private get EOF() {
    return this.tokens[0].type === TOKENS.EOF
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
      case TOKENS.Ident:
        return { kind: "Identifier", symbol: this.next().value }
      case TOKENS.Number:
        return { kind: "NumericLiteral", value: +this.next().value }
      case TOKENS.True:
      case TOKENS.False:
        return { kind: "BooleanLiteral", value: this.next().value === "true" }
      case TOKENS.Null: {
        this.next()
        return { kind: "NullLiteral", value: null }
      }
      case TOKENS.String:
        return { kind: "StringLiteral", value: this.next().value }
      case TOKENS.OpenParen: {
        this.next()
        const value = this.parseExpr()
        this.expect(
          TOKENS.CloseParen,
          new SyntaxError("missing closing parenthesis")
        )

        return value
      }
      default:
        throw new InternalError(`unexpected token '${this.curr().value}'`)
    }
  }

  private parseMemberExpr(): Expr {
    let object = this.parsePrimaryExpr()

    while (
      this.curr().type === TOKENS.Dot ||
      this.curr().type === TOKENS.OpenBracket
    ) {
      const operator = this.next()

      let property: Expr
      let computed: boolean

      // non-computed foo.bar
      if (operator.type === TOKENS.Dot) {
        computed = false
        // get ident
        property = this.parsePrimaryExpr()

        if (property.kind !== "Identifier")
          throw new SyntaxError("expected identifier after .")
      } else {
        // allow obj[computedValue]
        computed = true
        property = this.parseExpr()
        this.expect(TOKENS.CloseBracket, new SyntaxError("missing ]"))
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
    if (this.curr().type === TOKENS.OpenParen) return this.parseCallExpr(member)

    return member
  }

  private parseCallExpr(caller: Expr): Expr {
    let callExpr: Expr = {
      kind: "CallExpr",
      caller,
      args: this.parseArgs(),
    }

    // foo()()
    if (this.curr().type === TOKENS.OpenParen)
      callExpr = this.parseCallExpr(callExpr)

    return callExpr
  }

  // add(x + 5, y)
  private parseArgs(isDeclaration = false): Expr[] {
    const stmtType = isDeclaration ? "declaration" : "call"
    this.expect(
      TOKENS.OpenParen,
      new SyntaxError(`missing ( in function ${stmtType}`)
    )

    const args =
      this.curr().type === TOKENS.CloseParen ? [] : this.parseArgsList()

    this.expect(
      TOKENS.CloseParen,
      new SyntaxError(`missing ) in function ${stmtType}`)
    )

    return args
  }

  // foo(x= 5, v=5)
  private parseArgsList(): Expr[] {
    const args = [this.parseAssignmentExpr()]
    while (this.curr().type === TOKENS.Comma && this.next())
      args.push(this.parseAssignmentExpr())

    return args
  }

  private parseUnaryExpr(): Expr {
    if (this.curr().type === TOKENS.UnaryOp) {
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
    if (this.curr().type !== TOKENS.OpenBracket) return this.parseOrExpr()

    this.next()

    const items = new Array<ArrayItem>()

    let index = 0

    while (!this.EOF && this.curr().type !== TOKENS.CloseBracket) {
      const value = this.parseExpr()

      if (this.EOF) throw new SyntaxError("missing ]")

      items.push({
        kind: "ArrayItem",
        value,
        index: index++,
      })

      if (this.curr().type === TOKENS.Comma) this.next()
    }

    this.expect(TOKENS.CloseBracket, new SyntaxError("missing ]"))

    return { kind: "ArrayLiteral", items }
  }

  private parseObjectExpr(): Expr {
    if (this.curr().type !== TOKENS.OpenBrace) return this.parseArrayExpr()

    this.next()

    const properties = new Array<Property>()

    while (!this.EOF && this.curr().type !== TOKENS.CloseBrace) {
      // {key: value, key2: value2}
      // {key,...}

      const key = this.expect(
        TOKENS.Ident,
        new SyntaxError("missing key in object literal")
      ).value

      // { key,
      if (this.curr().type === TOKENS.Comma) {
        this.next()
        properties.push({ key })
        continue
      }

      // { key }
      if (this.curr().type === TOKENS.CloseBrace) {
        properties.push({ key })
        continue
      }

      // {key: val,}
      this.expect(TOKENS.Colon, new SyntaxError("missing : in object literal"))

      const value = this.parseExpr()

      properties.push({ key, value })

      if (this.curr().type !== TOKENS.CloseBrace) {
        this.expect(
          TOKENS.Comma,
          new SyntaxError("missing , in object literal")
        )
      }
    }

    this.expect(
      TOKENS.CloseBrace,
      new SyntaxError("missing } in object literal")
    )

    return { kind: "ObjectLiteral", properties }
  }

  private parseAssignmentExpr(): Expr {
    const left = this.parseObjectExpr()

    if (this.curr().type === TOKENS.Equals) {
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

    while (!this.EOF && this.curr().type !== TOKENS.CloseBrace)
      body.push(this.parseStmt())

    return body
  }

  private parseVarDeclaration(): VarDeclaration {
    const constant = this.next().type === TOKENS.Const

    const ident = this.expect(
      TOKENS.Ident,
      new SyntaxError("missing identifier in variable declaration")
    ).value

    if (this.EOF) {
      if (constant)
        throw new SyntaxError("missing value in constant declaration")
      return { kind: "VarDeclaration", constant, ident }
    }

    this.expect(
      TOKENS.Equals,
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

    this.expect(TOKENS.OpenBrace, new SyntaxError("missing {"))

    const declaration: Stmt = {
      kind: "ControlFlow",
      condition,
      body: this.parseBody(),
    }

    this.expect(TOKENS.CloseBrace, new SyntaxError("missing }"))

    if (this.EOF || this.curr().type !== TOKENS.Else) return declaration

    this.next()

    this.expect(TOKENS.OpenBrace, new SyntaxError("missing {"))

    declaration.elseBody = this.parseBody()

    this.expect(TOKENS.CloseBrace, new SyntaxError("missing }"))

    return declaration
  }

  private parseForLoop() {
    this.next()

    if (this.EOF) throw new SyntaxError("missing init")

    const init = this.parseVarDeclaration()

    if (this.EOF) throw new SyntaxError("missing condition")

    this.expect(
      TOKENS.SemiColon,
      new SyntaxError("missing ; after for loop init")
    )

    const condition = this.parseExpr()

    if (this.EOF) throw new SyntaxError("missing update")

    this.expect(
      TOKENS.SemiColon,
      new SyntaxError("missing ; after for loop condition")
    )

    const update = this.parseExpr()

    this.expect(TOKENS.OpenBrace, new SyntaxError("missing {"))

    const declaration: Stmt = {
      kind: "ForLoop",
      init,
      condition,
      update,
      body: this.parseBody(),
    }

    this.expect(TOKENS.CloseBrace, new SyntaxError("missing }"))

    return declaration
  }

  private parseWhileLoop() {
    this.next()

    if (this.EOF) throw new SyntaxError("missing condition")
    const condition = this.parseExpr()

    this.expect(TOKENS.OpenBrace, new SyntaxError("missing {"))

    const declaration: Stmt = {
      kind: "WhileLoop",
      condition,
      body: this.parseBody(),
    }

    this.expect(TOKENS.CloseBrace, new SyntaxError("missing }"))

    return declaration
  }

  private parseFunctionDeclaration() {
    this.next()
    const name = this.expect(
      TOKENS.Ident,
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

    this.expect(TOKENS.OpenBrace, new SyntaxError("missing {"))

    const declaration: Stmt = {
      kind: "FunctionDeclaration",
      name,
      parameters,
      body: this.parseBody(),
    }

    this.expect(TOKENS.CloseBrace, new SyntaxError("missing }"))

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
      case TOKENS.Let:
      case TOKENS.Const:
        return this.parseVarDeclaration()
      case TOKENS.If:
        return this.parseControlFlow()
      case TOKENS.For:
        return this.parseForLoop()
      case TOKENS.While:
        return this.parseWhileLoop()
      case TOKENS.Break:
      case TOKENS.Continue:
        return this.next().type === TOKENS.Break
          ? { kind: "Break" }
          : { kind: "Continue" }
      case TOKENS.Function:
        return this.parseFunctionDeclaration()
      case TOKENS.Return:
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
