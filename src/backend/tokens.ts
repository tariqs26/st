export const TOKENS = {
  // Literal Types
  Number: "Number",
  True: "True",
  False: "False",
  String: "String",
  Null: "Null",
  Ident: "Ident",
  // Keywords
  Let: "Let",
  Const: "Const",
  Function: "Function",
  Return: "Return",
  If: "If",
  Elif: "Elif",
  Else: "Else",
  While: "While",
  For: "For",
  Break: "Break",
  Continue: "Continue",
  Type: "Type",
  // Grouping + Operators
  OpenParen: "OpenParen",
  CloseParen: "CloseParen",
  OpenBracket: "OpenBracket",
  CloseBracket: "CloseBracket",
  OpenBrace: "OpenBrace",
  CloseBrace: "CloseBrace",
  Equals: "Equals",
  UnaryOp: "UnaryOp",
  BinaryOp: "BinaryOp",
  Comma: "Comma",
  Dot: "Dot",
  Colon: "Colon",
  SemiColon: "SemiColon",
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
  ["true", TOKENS.True],
  ["false", TOKENS.False],
  ["null", TOKENS.Null],
  ["let", TOKENS.Let],
  ["const", TOKENS.Const],
  ["fn", TOKENS.Function],
  ["return", TOKENS.Return],
  ["if", TOKENS.If],
  ["elif", TOKENS.Elif],
  ["else", TOKENS.Else],
  ["while", TOKENS.While],
  ["for", TOKENS.For],
  ["break", TOKENS.Break],
  ["continue", TOKENS.Continue],
  ["type", TOKENS.Type],
])

export const STANDALONE_TOKENS = new Map<string, TokenType>([
  ["%", TOKENS.BinaryOp],
  ["*", TOKENS.BinaryOp],
  ["(", TOKENS.OpenParen],
  [")", TOKENS.CloseParen],
  ["[", TOKENS.OpenBracket],
  ["]", TOKENS.CloseBracket],
  ["{", TOKENS.OpenBrace],
  ["}", TOKENS.CloseBrace],
  [",", TOKENS.Comma],
  [":", TOKENS.Colon],
  [";", TOKENS.SemiColon],
])
