#!/usr/bin/env node
import path from 'path'
import * as rl from 'readline-sync'
import { EOL } from 'os'
import { readFileSync } from 'fs'
import { SymTab } from './src/symtab.mjs'
import { Parser } from './src/parser.mjs'
import { Tokenizer } from './src/tokenizer.mjs'
import { Interpreter } from './src/interpreter.mjs'
import { IRGenerator } from './src/ir_generator.mjs'
import { TypeChecker } from './src/type_checker.mjs'

const help = () => console.error(`usage: ${path.basename(process.argv[1])} <command> [file/input]`)
const parse = (source) => {
    const scn = new Tokenizer(source)
    const parser = new Parser(scn.tokens())
    return parser.parseExpression()
}
const typecheck = (node) => {
    const typechecker = new TypeChecker()
    return typechecker.typecheck(node)
}

function main(){
    if (process.argv.length < 3){
        help()
        return 1
    }
    const command = process.argv[2]

    if (['-h', '--help'].includes(command)){
        help()
        return 0
    } else if (command.startsWith('-')){
        console.error(`Unsupported argument: '${command}'`)
        return 1
    }
    const isPath = (path) => {
        try {
            path.parse(path)
            return true
        } catch {
            return false
        }
    }

    const readSourceFile = () => {
        const inFile = process.argv[3]

        if (inFile === undefined){
            return rl.question('> ')
        } else if (isPath(inFile)){
            return readFileSync(inFile)
        }
        return inFile
    }
    
    switch(command){
        case 'ir': return generateIR(readSourceFile())
        case 'interpret': return interpret(readSourceFile())
        case 'repl': return repl()
        //case 'compile': return compile()
        default: {
            console.error(`Command '${command}' is not supported!`)
            return 1
        }
    }
}

function generateIR(source){
    const irGen = new IRGenerator()

    try {
        const res = irGen.generate(typecheck(parse(source)))
        console.log(res.join(EOL))
        return 0
    } catch(e) {
        console.error(e.message)
        return 1
    }
}

function interpret(source, env){
    const interpreter = new Interpreter(env)

    try {
        const res = interpreter.interpret(parse(source))
        console.log(res === null || res === undefined ? 'unit' : res)
        return 0
    } catch(e) {
        console.error(e.message)
        return 1
    }
}

function repl(){
    const sym = new SymTab()
    sym.addSymbol('print_int', (i) => console.log(i))
    sym.addSymbol('print_bool', (b) => console.log(b))
    sym.addSymbol('clear', () => console.clear())
    sym.addSymbol('exit', () => process.exit())

    while (true){
        interpret(rl.question('>>> '), sym)
    }
}

process.exit(main())