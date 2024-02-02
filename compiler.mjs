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

const tcSym = new SymTab()
const ipSym = new SymTab()
const genSym = new SymTab()

ipSym.addSymbol('print_int', (i) => console.log(i))
ipSym.addSymbol('print_bool', (b) => console.log(b))
ipSym.addSymbol('clear', () => console.clear())
ipSym.addSymbol('exit', () => process.exit())

const help = () => console.error(`usage: ${path.basename(process.argv[1])} <command> [file/input]`)
const parse = (source) => {
    const scn = new Tokenizer(source)
    const parser = new Parser(scn.tokens())
    return parser.parse()
}
const typecheck = (node) => {
    const typechecker = new TypeChecker(tcSym)
    return typechecker.typecheck(node)
}
const interpret = (node) => {
    const interpreter = new Interpreter(ipSym)
    return interpreter.interpret(node)
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
        case 'interpret': return run(readSourceFile())
        case 'repl': while(true) run(rl.question('>>> '))
        //case 'compile': return compile()
        default: {
            console.error(`Command '${command}' is not supported!`)
            return 1
        }
    }
}

function generateIR(source){
    const irGen = new IRGenerator(genSym)

    try {
        const res = []

        for (const expr of parse(source).filter(e => typecheck(e) && e)){
            irGen.generate(expr).forEach(i => res.push(i))
        }
        console.log(res.join(EOL))
        return 0
    } catch(e) {
        console.error(e.message)
        return 1
    }
}

function run(source){
    try {
        for (const expr of parse(source).filter(e => typecheck(e) && e)){
            const res = interpret(expr)
            console.log(res === null || res === undefined ? 'unit' : res)
        }
        return 0
    } catch(e) {
        console.error(e.message)
        return 1
    }
}

process.exit(main())