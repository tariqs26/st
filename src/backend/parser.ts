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
      case TOKENS.IDENT:
        return { kind: "Identifier", symbol: this.next().value }
      case TOKENS.NUMBER:
        return { kind: "NumericLiteral", value: +this.next().value }
      case TOKENS.TRUE:
      case TOKENS.FALSE:
        return { kind: "BooleanLiteral", value: this.next().value === "true" }
      case TOKENS.NULL: {
        this.next()
        return { kind: "NullLiteral", value: null }
      }
      case TOKENS.STRING:
        return { kind: "StringLiteral", value: this.next().value }
      case TOKENS.OPEN_PAREN: {
        this.next()
        const value = this.parseExpr()
        this.expect(
          TOKENS.CLOSE_PAREN,
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
      this.curr().type === TOKENS.DOT ||
      this.curr().type === TOKENS.OPEN_BRACKET
    ) {
      const operator = this.next()

      let property: Expr
      let computed: boolean

      // non-computed foo.bar
      if (operator.type === TOKENS.DOT) {
        computed = false
        // get ident
        property = this.parsePrimaryExpr()

        if (property.kind !== "Identifier")
          throw new SyntaxError("expected identifier after .")
      } else {
        // allow obj[computedValue]
        computed = true
        property = this.parseExpr()
        this.expect(TOKENS.CLOSE_BRACKET, new SyntaxError("missing ]"))
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
    if (this.curr().type === TOKENS.OPEN_PAREN)
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
    if (this.curr().type === TOKENS.OPEN_PAREN)
      callExpr = this.parseCallExpr(callExpr)

    return callExpr
  }

  // add(x + 5, y)
  private parseArgs(isDeclaration = false): Expr[] {
    const stmtType = isDeclaration ? "declaration" : "call"
    this.expect(
      TOKENS.OPEN_PAREN,
      new SyntaxError(`missing ( in function ${stmtType}`)
    )

    const args =
      this.curr().type === TOKENS.CLOSE_PAREN ? [] : this.parseArgsList()

    this.expect(
      TOKENS.CLOSE_PAREN,
      new SyntaxError(`missing ) in function ${stmtType}`)
    )

    return args
  }

  // foo(x= 5, v=5)
  private parseArgsList(): Expr[] {
    const args = [this.parseAssignmentExpr()]
    while (this.curr().type === TOKENS.COMMA && this.next())
      args.push(this.parseAssignmentExpr())

    return args
  }

  private parseUnaryExpr(): Expr {
    if (this.curr().type === TOKENS.UNARY_OP) {
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
    if (this.curr().type !== TOKENS.OPEN_BRACKET) return this.parseOrExpr()

    this.next()

    const items: ArrayItem[] = []

    let index = 0

    while (!this.EOF && this.curr().type !== TOKENS.CLOSE_BRACKET) {
      const value = this.parseExpr()

      if (this.EOF) throw new SyntaxError("missing ]")

      items.push({
        kind: "ArrayItem",
        value,
        index: index++,
      })

      if (this.curr().type === TOKENS.COMMA) this.next()
    }

    this.expect(TOKENS.CLOSE_BRACKET, new SyntaxError("missing ]"))

    return { kind: "ArrayLiteral", items }
  }

  private parseObjectExpr(): Expr {
    if (this.curr().type !== TOKENS.OPEN_BRACE) return this.parseArrayExpr()

    this.next()

    const properties: Property[] = []

    while (!this.EOF && this.curr().type !== TOKENS.CLOSE_BRACE) {
      // {key: value, key2: value2}
      // {key,...}

      const key = this.expect(
        TOKENS.IDENT,
        new SyntaxError("missing key in object literal")
      ).value

      // { key,
      if (this.curr().type === TOKENS.COMMA) {
        this.next()
        properties.push({ key })
        continue
      }

      // { key }
      if (this.curr().type === TOKENS.CLOSE_BRACE) {
        properties.push({ key })
        continue
      }

      // {key: val,}
      this.expect(TOKENS.COLON, new SyntaxError("missing : in object literal"))

      const value = this.parseExpr()

      properties.push({ key, value })

      if (this.curr().type !== TOKENS.CLOSE_BRACE) {
        this.expect(
          TOKENS.COMMA,
          new SyntaxError("missing , in object literal")
        )
      }
    }

    this.expect(
      TOKENS.CLOSE_BRACE,
      new SyntaxError("missing } in object literal")
    )

    return { kind: "ObjectLiteral", properties }
  }

  private parseAssignmentExpr(): Expr {
    const left = this.parseObjectExpr()

    if (this.curr().type === TOKENS.EQUALS) {
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
    const body: Stmt[] = []

    while (!this.EOF && this.curr().type !== TOKENS.CLOSE_BRACE)
      body.push(this.parseStmt())

    return body
  }

  private parseVarDeclaration(): VarDeclaration {
    const constant = this.next().type === TOKENS.CONST

    const ident = this.expect(
      TOKENS.IDENT,
      new SyntaxError("missing identifier in variable declaration")
    ).value

    if (this.EOF) {
      if (constant)
        throw new SyntaxError("missing value in constant declaration")
      return { kind: "VarDeclaration", constant, ident }
    }

    this.expect(
      TOKENS.EQUALS,
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

    this.expect(TOKENS.OPEN_BRACE, new SyntaxError("missing {"))

    const declaration: Stmt = {
      kind: "ControlFlow",
      condition,
      body: this.parseBody(),
    }

    this.expect(TOKENS.CLOSE_BRACE, new SyntaxError("missing }"))

    if (this.EOF || this.curr().type !== TOKENS.ELSE) return declaration

    this.next()

    this.expect(TOKENS.OPEN_BRACE, new SyntaxError("missing {"))

    declaration.elseBody = this.parseBody()

    this.expect(TOKENS.CLOSE_BRACE, new SyntaxError("missing }"))

    return declaration
  }

  private parseForLoop() {
    this.next()

    if (this.EOF) throw new SyntaxError("missing init")

    const init = this.parseVarDeclaration()

    if (this.EOF) throw new SyntaxError("missing condition")

    this.expect(
      TOKENS.SEMI_COLON,
      new SyntaxError("missing ; after for loop init")
    )

    const condition = this.parseExpr()

    if (this.EOF) throw new SyntaxError("missing update")

    this.expect(
      TOKENS.SEMI_COLON,
      new SyntaxError("missing ; after for loop condition")
    )

    const update = this.parseExpr()

    this.expect(TOKENS.OPEN_BRACE, new SyntaxError("missing {"))

    const declaration: Stmt = {
      kind: "ForLoop",
      init,
      condition,
      update,
      body: this.parseBody(),
    }

    this.expect(TOKENS.CLOSE_BRACE, new SyntaxError("missing }"))

    return declaration
  }

  private parseWhileLoop() {
    this.next()

    if (this.EOF) throw new SyntaxError("missing condition")
    const condition = this.parseExpr()

    this.expect(TOKENS.OPEN_BRACE, new SyntaxError("missing {"))

    const declaration: Stmt = {
      kind: "WhileLoop",
      condition,
      body: this.parseBody(),
    }

    this.expect(TOKENS.CLOSE_BRACE, new SyntaxError("missing }"))

    return declaration
  }

  private parseFunctionDeclaration() {
    this.next()
    const name = this.expect(
      TOKENS.IDENT,
      new SyntaxError("missing function name")
    ).value

    const params = this.parseArgs(true)
    const parameters: FunctionParameter[] = []

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

    this.expect(TOKENS.OPEN_BRACE, new SyntaxError("missing {"))

    const declaration: Stmt = {
      kind: "FunctionDeclaration",
      name,
      parameters,
      body: this.parseBody(),
    }

    this.expect(TOKENS.CLOSE_BRACE, new SyntaxError("missing }"))

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
      case TOKENS.LET:
      case TOKENS.CONST:
        return this.parseVarDeclaration()
      case TOKENS.IF:
        return this.parseControlFlow()
      case TOKENS.FOR:
        return this.parseForLoop()
      case TOKENS.WHILE:
        return this.parseWhileLoop()
      case TOKENS.BREAK:
      case TOKENS.CONTINUE:
        return this.next().type === TOKENS.BREAK
          ? { kind: "Break" }
          : { kind: "Continue" }
      case TOKENS.FUNCTION:
        return this.parseFunctionDeclaration()
      case TOKENS.RETURN:
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
