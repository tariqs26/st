export enum TokenType {
  // Literal Types
  Number = 0,
  True = 1,
  False = 2,
  String = 3,
  Null = 4,
  Ident = 5,
  // Keywords
  Let = 6,
  Const = 7,
  Function = 8,
  Return = 9,
  If = 10,
  Elif = 11,
  Else = 12,
  While = 13,
  For = 14,
  Break = 15,
  Continue = 16,
  Type = 17,
  // Grouping + Operators
  Equals = 18,
  OpenParen = 19,
  CloseParen = 20,
  OpenBracket = 21,
  CloseBracket = 22,
  OpenBrace = 23,
  CloseBrace = 24,
  UnaryOp = 25,
  BinaryOp = 26,
  Comma = 27,
  Dot = 28,
  Colon = 29,
  SemiColon = 30,
  EOF = 31,
}

export type Token = {
  value: string
  type: TokenType
  ln: number
  startPos: number
  endPos: number
}

export const KEYWORDS: Record<string, TokenType> = {
  true: TokenType.True,
  false: TokenType.False,
  null: TokenType.Null,
  let: TokenType.Let,
  const: TokenType.Const,
  fn: TokenType.Function,
  return: TokenType.Return,
  if: TokenType.If,
  elif: TokenType.Elif,
  else: TokenType.Else,
  while: TokenType.While,
  for: TokenType.For,
  break: TokenType.Break,
  continue: TokenType.Continue,
  type: TokenType.Type,
}

export const BINARY_OPERATORS = ["%", "*"]
