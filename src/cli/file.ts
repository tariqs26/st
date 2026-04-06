import { Interpreter } from "@/runtime/interpreter"

async function run() {
  const interpreter = new Interpreter()

  const filePath = process.argv.slice(2)[0]
  if (!filePath) throw new Error("Error: missing file argument")

  if (!filePath.endsWith(".st"))
    throw new Error("Error: file must have .st extension")

  console.log(`Running file "${filePath}"...`)

  const file = Bun.file(filePath)
  const input = await file.text()

  interpreter.run(input)
}

run().catch((error) => console.error((error as Error).message))
