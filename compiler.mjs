#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { EOL } from 'os'
import * as rl from 'readline-sync'
import { SymTab } from './src/symtab.mjs'
import { Parser } from './src/parser.mjs'
import { Tokenizer } from './src/tokenizer.mjs'
import { Interpreter } from './src/interpreter.mjs'
import { IRGenerator } from './src/ir_generator.mjs'
import { ClearFn, ExitFn } from './src/types.mjs'
import { TypeChecker } from './src/type_checker.mjs'
import { Assembler } from './assembler.mjs'
import { AssemblyGenerator } from './src/assembly_generator.mjs'

const tcSym = new SymTab()
const ipSym = new SymTab()
const genSym = new SymTab()

tcSym.addSymbol('clear', ClearFn)
tcSym.addSymbol('exit', ExitFn)

ipSym.addSymbol('print_int', (i) => console.log(i))
ipSym.addSymbol('print_bool', (b) => console.log(b))
ipSym.addSymbol('clear', () => console.clear())
ipSym.addSymbol('exit', () => process.exit())

const parse = (source) => {
    const scn = new Tokenizer(source)
    const parser = new Parser(scn.tokens())
    return parser.parse()
}
const typecheck = (node) => {
    const typechecker = new TypeChecker(tcSym)
    return typechecker.typecheck(node)
}
const parseAndCheck = (source) => parse(source).filter(e => typecheck(e) && e)
const interpret = (source, callback) => {
    const interpreter = new Interpreter(ipSym)
    parseAndCheck(source).forEach(e => callback(interpreter.interpret(e)))
}
const printResult = (res) => console.log(res === null || res === undefined ? 'unit' : res)
const ir = (source) => {
    const irGen = new IRGenerator(genSym)
    return parseAndCheck(source).flatMap(e => irGen.generate(e))
}
const asm = (source) => {
    const asmGen = new AssemblyGenerator(ir(source))
    return asmGen.generate()
}
const assemble = (source) => {
    const rasm = new Assembler()
    return rasm.assemble(asm(source), { out: 'asm', tmpname: 'asm' })
}

const commandPool = Object.freeze({
    'asm': (code) => exec(code, (source) => console.log(asm(source))),
    'ir': (code) => exec(code, (source) => console.log(ir(source).join(EOL))),
    'interpret': (code) => exec(code, (source) => interpret(source, printResult)),
    'repl': () => exec(null, () => { while(true) interpret(rl.question('>>> '), printResult) }),
    'compile': (code) => exec(code, (source) => process.stdout.write(assemble(source)))
})

const help = () => {
    const getenv = (env) => `${env}=${process.env[env] ? `"${process.env[env]}"` : '<not set>'}`
    const msg = `usage: ${path.basename(process.argv[1])} <command> [file/input]

AVAILABLE COMMANDS:
    ${Object.keys(commandPool).join(', ')}

ENVIRONMENT VARIABLES:
    ${getenv('RASM_HOST_PATH')}
    ${getenv('RASM_HOST_KEY')}
    ${getenv('CSCP_ASM')}`
    console.error(msg)
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
            return fs.readFileSync(inFile)
        }
        return inFile
    }

    if (!commandPool[command]){
        console.error(`Command '${command}' is not supported!`)
        return 1
    } else if (commandPool[command].length){
        return commandPool[command](readSourceFile())
    }
    return commandPool[command]()
}

function exec(source, callback){
    try {
        callback.length ? callback(source) : callback()
        return 0
    } catch(e) {
        console.error(e.message)
        return 1
    }
}

process.exit(main())