export type Stmt =
  | Program
  | VarDeclaration
  | FunctionDeclaration
  | ControlFlow
  | ForLoop
  | WhileLoop
  | BreakStmt
  | ContinueStmt
  | Return
  | Expr

export type Program = {
  kind: "Program"
  body: Stmt[]
}

export type VarDeclaration = {
  kind: "VarDeclaration"
  constant: boolean
  ident: string
  value?: Expr
}

export type ControlFlow = {
  kind: "ControlFlow"
  condition: Expr
  body: Stmt[]
  elseBody?: Stmt[]
}

export type ForLoop = {
  kind: "ForLoop"
  init: Stmt
  condition: Expr
  update: Stmt
  body: Stmt[]
}

export type WhileLoop = {
  kind: "WhileLoop"
  condition: Expr
  body: Stmt[]
}

export type BreakStmt = {
  kind: "Break"
}

export type ContinueStmt = {
  kind: "Continue"
}

export type FunctionParameter = Identifier | AssignmentExpr

export type FunctionDeclaration = {
  kind: "FunctionDeclaration"
  name: string
  parameters: FunctionParameter[]
  body: Stmt[]
}

export type Return = {
  kind: "Return"
  value?: Expr
}

export type TypeDeclaration = {
  kind: "TypeDeclaration"
  ident: string
  value: string
}

export type Expr =
  | Identifier
  | NumericLiteral
  | BooleanLiteral
  | StringLiteral
  | NullLiteral
  | MemberExpr
  | CallExpr
  | UpdateExpr
  | UnaryExpr
  | BinaryExpr
  | ArrayLiteral
  | ObjectLiteral
  | AssignmentExpr

export type AssignmentExpr = {
  kind: "AssignmentExpr"
  assignee: Expr
  value: Expr
}

export type MemberExpr = {
  kind: "MemberExpr"
  object: Expr
  // foo.bar
  property: Expr
  // foo["bar"]
  computed: boolean
}

export type CallExpr = {
  kind: "CallExpr"
  args: Expr[]
  caller: Expr
}

export type UpdateExpr = {
  kind: "UpdateExpr"
  operator: string
  prefix: boolean
  operand: Expr
}

export type UnaryExpr = {
  kind: "UnaryExpr"
  operator: string
  operand: Expr
}

export type BinaryExpr = {
  kind: "BinaryExpr"
  left: Expr
  right: Expr
  operator: string
}

export type Identifier = {
  kind: "Identifier"
  symbol: string
}

export type NumericLiteral = {
  kind: "NumericLiteral"
  value: number
}

export type BooleanLiteral = {
  kind: "BooleanLiteral"
  value: boolean
}

export type NullLiteral = {
  kind: "NullLiteral"
  value: null
}

export type StringLiteral = {
  kind: "StringLiteral"
  value: string
}

export type Property = {
  key: string
  value?: Expr
}

export type ObjectLiteral = {
  kind: "ObjectLiteral"
  properties: Property[]
}

export type ArrayItem = {
  kind: "ArrayItem"
  index: number
  value: Expr
}

export type ArrayLiteral = {
  kind: "ArrayLiteral"
  items: ArrayItem[]
}
