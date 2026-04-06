export const TOKENS = {
  // Literal Types
  NUMBER: "NUMBER",
  TRUE: "TRUE",
  FALSE: "FALSE",
  STRING: "STRING",
  NULL: "NULL",
  IDENT: "IDENT",
  // Keywords
  LET: "LET",
  CONST: "CONST",
  FUNCTION: "FUNCTION",
  RETURN: "RETURN",
  IF: "IF",
  ELIF: "ELIF",
  ELSE: "ELSE",
  WHILE: "WHILE",
  FOR: "FOR",
  BREAK: "BREAK",
  CONTINUE: "CONTINUE",
  TYPE: "TYPE",
  // Grouping + Operators
  OPEN_PAREN: "OPEN_PAREN",
  CLOSE_PAREN: "CLOSE_PAREN",
  OPEN_BRACKET: "OPEN_BRACKET",
  CLOSE_BRACKET: "CLOSE_BRACKET",
  OPEN_BRACE: "OPEN_BRACE",
  CLOSE_BRACE: "CLOSE_BRACE",
  EQUALS: "EQUALS",
  UNARY_OP: "UNARY_OP",
  BINARY_OP: "BINARY_OP",
  COMMA: "COMMA",
  DOT: "DOT",
  COLON: "COLON",
  SEMI_COLON: "SEMI_COLON",
  EOF: "EOF",
} as const

export type TokenType = keyof typeof TOKENS

export type Token = {
  value: string
  type: TokenType
  ln: number
  startPos: number
  endPos: number
}

export const KEYWORDS = new Map<string, TokenType>([
  ["true", TOKENS.TRUE],
  ["false", TOKENS.FALSE],
  ["null", TOKENS.NULL],
  ["let", TOKENS.LET],
  ["const", TOKENS.CONST],
  ["fn", TOKENS.FUNCTION],
  ["return", TOKENS.RETURN],
  ["if", TOKENS.IF],
  ["elif", TOKENS.ELIF],
  ["else", TOKENS.ELSE],
  ["while", TOKENS.WHILE],
  ["for", TOKENS.FOR],
  ["break", TOKENS.BREAK],
  ["continue", TOKENS.CONTINUE],
  ["type", TOKENS.TYPE],
])

export const STANDALONE_TOKENS = new Map<string, TokenType>([
  ["%", TOKENS.BINARY_OP],
  ["*", TOKENS.BINARY_OP],
  ["(", TOKENS.OPEN_PAREN],
  [")", TOKENS.CLOSE_PAREN],
  ["[", TOKENS.OPEN_BRACKET],
  ["]", TOKENS.CLOSE_BRACKET],
  ["{", TOKENS.OPEN_BRACE],
  ["}", TOKENS.CLOSE_BRACE],
  [",", TOKENS.COMMA],
  [":", TOKENS.COLON],
  [";", TOKENS.SEMI_COLON],
])
