import { SyntaxError } from "../utils/errors"
import { identifier, isAlpha, isDigit, isWhitespace } from "../utils/validators"
import { BINARY_OPERATORS, KEYWORDS, TokenType, type Token } from "./tokens"

const markInvalidToken = (ch: string, pos: number) => {
  throw new SyntaxError(`illegal character '${ch}' at pos ${pos}`)
}

export default class Lexer {
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
      (isDigit(src[this.pos]) || src[this.pos] === ".")
    ) {
      if (src[this.pos] === ".") {
        if (isFloat) throw new SyntaxError("float number has more than one '.'")
        isFloat = true
      }
      num += src[this.pos++]
    }

    this.tokens.push(this.token(num, TokenType.Number))
  }

  private identifier(src: string) {
    let ident = ""

    while (this.pos < src.length && identifier(src[this.pos]))
      ident += src[this.pos++]

    this.tokens.push(this.token(ident, KEYWORDS[ident] ?? TokenType.Ident))
  }

  private string(src: string) {
    let str = ""
    this.pos++
    while (this.pos < src.length && src[this.pos] !== '"')
      str += src[this.pos++]

    if (src[this.pos] === undefined || src[this.pos] !== '"')
      throw new SyntaxError("unterminated string literal")

    this.tokens.push(this.token(str, TokenType.String))
  }

  tokenize(src: string): Token[] {
    while (this.pos < src.length) {
      const ch = src[this.pos]
      if (ch === "#") {
        this.pos++
        while (this.pos < src.length && src[this.pos] !== "\n") this.pos++
      } else if (ch === "(")
        this.tokens.push(this.token(ch, TokenType.OpenParen))
      else if (ch === ")")
        this.tokens.push(this.token(ch, TokenType.CloseParen))
      else if (ch === "[")
        this.tokens.push(this.token(ch, TokenType.OpenBracket))
      else if (ch === "]")
        this.tokens.push(this.token(ch, TokenType.CloseBracket))
      else if (ch === "{") this.tokens.push(this.token(ch, TokenType.OpenBrace))
      else if (ch === "}")
        this.tokens.push(this.token(ch, TokenType.CloseBrace))
      else if (ch === ",") this.tokens.push(this.token(ch, TokenType.Comma))
      else if (ch === ".") {
        if (this.pos < src.length && isDigit(src[this.pos + 1])) {
          if (this.pos > 0 && !isAlpha(src[this.pos - 1])) {
            this.number(src)
            continue
          }
        }
        this.tokens.push(this.token(ch, TokenType.Dot))
      } else if (ch === ":") this.tokens.push(this.token(ch, TokenType.Colon))
      else if (ch === ";") this.tokens.push(this.token(ch, TokenType.SemiColon))
      else if (ch === "=") {
        this.pos++
        if (this.pos < src.length && src[this.pos] === ch)
          this.tokens.push(this.token(ch.repeat(2), TokenType.BinaryOp))
        else {
          this.tokens.push(this.token(ch, TokenType.Equals))
          continue
        }
      } else if (["+", "-"].includes(ch)) {
        if (this.pos < src.length && src[this.pos + 1] === ch) {
          this.pos++
          this.tokens.push(this.token(ch.repeat(2), TokenType.UnaryOp))
        } else if (this.pos < src.length && !isWhitespace(src[this.pos + 1])) {
          this.tokens.push(this.token(ch, TokenType.UnaryOp))
        } else this.tokens.push(this.token(ch, TokenType.BinaryOp))
      } else if (ch === "!") {
        if (this.pos < src.length && src[this.pos + 1] === "=") {
          this.pos++
          this.tokens.push(this.token("!=", TokenType.BinaryOp))
        } else if (this.pos < src.length && !isWhitespace(src[this.pos + 1]))
          this.tokens.push(this.token("!", TokenType.UnaryOp))
        else markInvalidToken(ch, this.pos)
      } else if ([">", "<"].includes(ch)) {
        this.pos++
        let op = ch
        if (this.pos < src.length && src[this.pos] === "=") op += "="
        this.tokens.push(this.token(op, TokenType.BinaryOp))
      } else if (BINARY_OPERATORS.includes(ch))
        this.tokens.push(this.token(ch, TokenType.BinaryOp))
      else if (ch === "/") {
        this.pos++
        let op = ch
        if (this.pos < src.length && src[this.pos] === ch) op += ch
        this.tokens.push(this.token(op, TokenType.BinaryOp))
      } else if (["|", "&"].includes(ch)) {
        this.pos++
        if (this.pos < src.length && src[this.pos] === ch)
          this.tokens.push(this.token(ch.repeat(2), TokenType.BinaryOp))
        else markInvalidToken(ch, this.pos - 1)
      } else if (isDigit(ch)) {
        this.number(src)
        continue
      } else if (isAlpha(ch)) {
        this.identifier(src)
        continue
      } else if (ch === '"') this.string(src)
      else if (ch === "\n") this.ln++
      else if (!isWhitespace(ch)) markInvalidToken(ch, this.pos)

      this.pos++
    }

    this.tokens.push(this.token("EndOfFile", TokenType.EOF))
    return this.tokens
  }
}
