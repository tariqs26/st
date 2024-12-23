import { beforeEach, describe, expect, test } from "bun:test"
import Lexer from "../src/backend/lexer"
import { KEYWORDS } from "../src/backend/tokens"

const lexer = new Lexer()

describe("Lexer", () => {
  beforeEach(() => {
    lexer.reset()
  })

  test.each(Array.from(KEYWORDS))(
    "tokenizes keyword '%s' as token '%s'",
    (keyword, token) => {
      const tokens = lexer.tokenize(keyword)

      expect(tokens[0]).toEqual({
        value: keyword,
        type: token,
        ln: 1,
        startPos: 0,
        endPos: keyword.length,
      })
    }
  )
})
