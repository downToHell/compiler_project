#!/usr/bin/env node
import readline from 'readline'
import { Tokenizer } from './src/tokenizer.mjs'
import { Parser } from './src/parser.mjs'
import { Interpreter } from './src/interpreter.mjs'
import { SymTab } from './src/symtab.mjs'

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const repl = async (text) => {
    return new Promise((resolve, _) => rl.question(text, (answer) => resolve(answer)))
}

const sym = new SymTab()
sym.addSymbol('print_int', (i) => console.log(i))
sym.addSymbol('print_bool', (b) => console.log(b))
sym.addSymbol('clear', () => console.clear())
sym.addSymbol('exit', () => process.exit())

while (true){
    const command = await repl('>>> ')

    try {
        const scn = new Tokenizer(command)
        const parser = new Parser(scn.tokens())
        const interpreter = new Interpreter(sym)
        console.log(interpreter.interpret(parser.parseExpression()))
    } catch(e) {
        console.error(e.message)
    }
}