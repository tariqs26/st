export const validator = {
  isAlpha: (ch: string) => /[A-Za-z_]/g.test(ch),
  isDigit: (ch: string) => /\d/g.test(ch),
  identifier: (ch: string) => validator.isAlpha(ch) || validator.isDigit(ch),
  isWhitespace: (ch: string) => /\s/g.test(ch),
}
