const isAlpha = (ch: string) => /[A-Za-z_]/g.test(ch)

const isDigit = (ch: string) => /[0-9]/g.test(ch)

const identifier = (ch: string) => isAlpha(ch) || isDigit(ch)

const isWhitespace = (ch: string) => /[\s]/g.test(ch)

export { isAlpha, isDigit, identifier, isWhitespace }
