import { SyntaxError } from "../utils/errors"
import { validator } from "../utils/validator"
import {
  KEYWORDS,
  STANDALONE_TOKENS,
  TOKENS,
  type Token,
  type TokenType,
} from "./tokens"

const markInvalidToken = (ch: string, pos: number) => {
  throw new SyntaxError(`illegal character '${ch}' at pos ${pos}`)
}

export class Lexer {
  private pos = 0
  private ln = 1
  private tokens = new Array<Token>()

  private token(value: string, type: TokenType): Token {
    return {
      value,
      type,
      ln: this.ln,
      startPos: this.pos - value.length,
      endPos: this.pos,
    }
  }

  private number(src: string) {
    let num = ""
    let isFloat = false

    while (
      this.pos < src.length &&
      (validator.isDigit(src[this.pos]) || src[this.pos] === ".")
    ) {
      if (src[this.pos] === ".") {
        if (isFloat) throw new SyntaxError("float number has more than one '.'")
        isFloat = true
      }
      num += src[this.pos++]
    }

    this.tokens.push(this.token(num, TOKENS.Number))
  }

  private identifier(src: string) {
    let ident = ""

    while (this.pos < src.length && validator.identifier(src[this.pos]))
      ident += src[this.pos++]

    this.tokens.push(this.token(ident, KEYWORDS.get(ident) ?? TOKENS.Ident))
  }

  private string(src: string) {
    let str = ""
    this.pos++
    while (this.pos < src.length && src[this.pos] !== '"')
      str += src[this.pos++]

    if (src[this.pos] === undefined || src[this.pos] !== '"')
      throw new SyntaxError("unterminated string literal")

    this.tokens.push(this.token(str, TOKENS.String))
  }

  tokenize(src: string): Token[] {
    while (this.pos < src.length) {
      const ch = src[this.pos]
      if (ch === "#") {
        // comments
        this.pos++
        while (this.pos < src.length && src[this.pos] !== "\n") this.pos++
      } else if (STANDALONE_TOKENS.has(ch))
        this.tokens.push(this.token(ch, STANDALONE_TOKENS.get(ch) as TokenType))
      else if (ch === ".") {
        // check for float number
        if (this.pos < src.length && validator.isDigit(src[this.pos + 1])) {
          if (this.pos > 0 && !validator.isAlpha(src[this.pos - 1])) {
            this.number(src)
            continue
          }
        }
        this.tokens.push(this.token(ch, TOKENS.Dot))
      } else if (ch === "=") {
        // check for equality or assignment
        this.pos++
        if (this.pos < src.length && src[this.pos] === ch)
          this.tokens.push(this.token(ch.repeat(2), TOKENS.BinaryOp))
        else {
          this.tokens.push(this.token(ch, TOKENS.Equals))
          continue
        }
      } else if (["+", "-"].includes(ch)) {
        // check for unary operator (e.g. -1)
        if (
          this.pos < src.length &&
          !validator.isWhitespace(src[this.pos + 1])
        ) {
          this.tokens.push(this.token(ch, TOKENS.UnaryOp))
        } else this.tokens.push(this.token(ch, TOKENS.BinaryOp))
      } else if (ch === "!") {
        // check for != or !
        if (this.pos < src.length && src[this.pos + 1] === "=") {
          this.pos++
          this.tokens.push(this.token("!=", TOKENS.BinaryOp))
        } else if (
          this.pos < src.length &&
          !validator.isWhitespace(src[this.pos + 1])
        )
          this.tokens.push(this.token("!", TOKENS.UnaryOp))
        else markInvalidToken(ch, this.pos)
      } else if ([">", "<"].includes(ch)) {
        // check for comparison operators
        this.pos++
        let op = ch
        if (this.pos < src.length && src[this.pos] === "=") op += "="
        this.tokens.push(this.token(op, TOKENS.BinaryOp))
      } else if (ch === "/") {
        this.pos++
        let op = ch
        if (this.pos < src.length && src[this.pos] === ch) op += ch
        this.tokens.push(this.token(op, TOKENS.BinaryOp))
      } else if (["|", "&"].includes(ch)) {
        // check for bitwise (|, &) or logical (||, &&) operators
        this.pos++
        if (this.pos < src.length && src[this.pos] === ch)
          this.tokens.push(this.token(ch.repeat(2), TOKENS.BinaryOp))
        else markInvalidToken(ch, this.pos - 1)
      } else if (validator.isDigit(ch)) {
        this.number(src)
        continue
      } else if (validator.isAlpha(ch)) {
        this.identifier(src)
        continue
      } else if (ch === '"') this.string(src)
      else if (ch === "\n") this.ln++
      else if (!validator.isWhitespace(ch)) markInvalidToken(ch, this.pos)

      this.pos++
    }

    return [
      ...this.tokens,
      {
        value: "EndOfFile",
        type: TOKENS.EOF,
        ln: this.ln,
        startPos: this.pos,
        endPos: this.pos,
      },
    ]
  }

  reset() {
    this.pos = 0
    this.ln = 1
    this.tokens = new Array<Token>()
  }
}
