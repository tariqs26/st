<h1>st-programming-language</h1>

An interpreted language with a JavaScript-like syntax, written in Typescript. Features a lexer, ast, parser, and interpreter, with a repl and file runner.

<h2>Table of Contents</h2>

- [Syntax and Features](#syntax-and-features)
  - [Data Types](#data-types)
  - [Expressions](#expressions)
    - [Unary](#unary)
    - [Binary](#binary)
    - [Assignment](#assignment)
    - [Member Access](#member-access)
      - [Computed](#computed)
      - [Object With Identifier](#object-with-identifier)
      - [Type Specific Built-in Properties](#type-specific-built-in-properties)
    - [Function Call](#function-call)
  - [Statements](#statements)
    - [Variable Declaration](#variable-declaration)
    - [Control Flow](#control-flow)
    - [Loops](#loops)
      - [For](#for)
      - [While](#while)
    - [Function Declaration](#function-declaration)
  - [Comments](#comments)
  - [Native Functions](#native-functions)
- [Installation](#installation)
- [Available Scripts](#available-scripts)
- [Usage](#usage)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## Syntax and Features

### Data Types

- Number `3`, `3.14`
- String `"Hello, World!"`
- Boolean `true`, `false`
- Null `null`
- Array `[1, 2, 3]`
- Object `{ key: "value" }`

### Expressions

#### Unary

- Logical `!`
- Negation `-`
- Positive `+`

#### Binary

- Multiplicative `(*, /, //, %)`
- Additive `(+, -)`
- Relational `(==, !=, <, <=, >, >=)`
- Logical `(&&, ||)`

#### Assignment

```rs
x = 3
```

#### Member Access

##### Computed

```rs
foo[0]
foo[3 + 4]
foo["bar"]
```

##### Object With Identifier

```rs
foo.bar
```

##### Type Specific Built-in Properties

```rs
const foo = []

foo.length
foo.push(3)
```

#### Function Call

```rs
add(3, 4)
```

### Statements

#### Variable Declaration

```rs
const foo = 3
let bar = "Hello, World!"
```

#### Control Flow

limited to if-else for now, parentheses are optional

```rs
if 3 > 2 {
  print("3 is greater than 2")
} else {
  print("3 is equal to 2")
}
```

#### Loops

##### For

```rs
for let i = 0; i < 10; i = i + 1 {
  print(i)
}
```

##### While

```rs
let i = 0

while i < 10 {
  print(i)
  i = i + 1
}
```

#### Function Declaration

Function declarations support both closures and recursion.

```rs
fn fib(n) {
  if n <= 1 {
    return n
  }

  return fib(n - 1) + fib(n - 2)
}
```

### Comments

```py
# this is a comment
```

### Native Functions

```rs
print("Hello, World!")

const name = input("What is your name?")

random()
random(1, 10)

typeof(3)
```

## Installation

```bash
bun install
```

## Available Scripts

| Command           | Description  | Example               |
| ----------------- | ------------ | --------------------- |
| `bun run repl`    | Run the repl |                       |
| `bun file <file>` | Run a file   | `bun file program.st` |

## Usage

Example file `program.st`:

```rs
fn add(a, b) {
  let sum = a + b
  return sum
}

const result = add(3, 4)

const foo = {
  result: result / 3,
  add,
  isBar: 1 > 2 || 3 < 4,
}

let key = "isBar"

if foo[key] == "isBar" {
  print("foo is bar")
} else {
  print("foo is not bar")
}

print(foo.result)
print(foo.add(3, 4))

fn counter() {
  let count = 0
  fn increment() {
    count = count + 1
    return count
  }

  return increment
}

let increment = counter()

while increment() < 10 {
  print(increment())
}
```

Run file: `bun file program.st`

## Roadmap

- [ ] Control Flow (elif)
- [ ] Update expression (++, --) postfix/prefix
- [ ] Better Error Messages with Line Numbers and Context
- [ ] Error Handling (try-catch, throw)

## Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgements

- <https://www.youtube.com/playlist?list=PL_2VhOvlMk4UHGqYCLWc6GO8FaPl8fQTh>
- <https://astexplorer.net/>
