#!/usr/bin/env node
import fs from 'fs'
import { EOL } from 'os'
import { basename } from 'path'
import * as rl from 'readline-sync'
import * as cs from './compiler_suite.mjs'

const printResult = (res) => {
    if (res === null || res === undefined) res = 'unit'
    console.log(typeof res === 'object' ? res.toString() : res)
}
const compile = (code, run) => exec(code, (source) => process.stdout.write(cs.assemble(source, { run })))
const repl = () => {
    while (true){
        try {
            cs.interpret(rl.question('>>> '), { callback: printResult, repl: true })
        } catch (e) {
            console.error(e.message)
        }
    }
}

const commandPool = Object.freeze({
    'asm': (code) => exec(code, (source) => console.log(cs.asm(source))),
    'ir': (code) => exec(code, (source) => console.log(cs.ir(source).join(EOL))),
    'interpret': (code) => exec(code, (source) => cs.interpret(source, { callback: printResult })),
    repl,
    'compile': (code) => compile(code, false),
    'run': (code) => compile(code, true)
})

const help = () => {
    const getenv = (env) => `${env}=${process.env[env] ? `"${process.env[env]}"` : '<not set>'}`
    const msg = `usage: ${basename(process.argv[1])} <command> [file/input]

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
            fs.statSync(path)
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
            return fs.readFileSync(inFile).toString()
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