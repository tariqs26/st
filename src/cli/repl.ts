import Interpreter from "runtime/interpreter"
;(function repl() {
  const interpreter = new Interpreter()

  const border = `*${"-".repeat(13)}*`
  console.log(`${border}\n*   ST REPL   *\n${border}`)

  while (true) {
    const input = prompt("\n>")

    if (!input || input.includes("exit")) return

    console.log()

    try {
      interpreter.run(input, true)
    } catch (error) {
      console.error((error as Error).message)
    }
  }
})()
