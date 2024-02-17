#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { EOL } from 'os'
import { parse } from './test_parser.mjs'
import { assemble } from './compiler_suite.mjs'
import { execFileSync } from 'child_process'

const TEST_DIVIDER = '---'
const TAB = '  '
const YELLOW = '\x1b[33m'
const GRAY = '\x1b[90m'
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const CHECK = '\u2714'
const X_MARK = '\u2717'
const RESET = '\x1b[0m'

const formatPass = (msg) => {
    return `${TAB}${TAB}${GREEN}${CHECK}${RESET}${GRAY} pass: ${msg}${RESET}`
}
const formatFail = (msg) => {
    return `${TAB}${TAB}${RED}${X_MARK} fail: ${msg}${RESET}`
}

function TestRunner(){
    const discover = (dir) => {
        return fs.readdirSync(dir)
                 .map(f => path.join(dir, f))
                 .filter(f => fs.statSync(f).isFile())
                 .filter(f => path.extname(f) === '.txt')
    }
    const getTestCases = (file) => {
        const contents = fs.readFileSync(file).toString()
        return contents.split(TEST_DIVIDER).map(parse)
    }
    const runTest = (file, input) => {
        return execFileSync(`./${file}`, { shell: true, encoding: 'utf-8', input })
    }
    const checkAssertions = (assertions, values) => {
        if (assertions.length != values.length){
            return false
        }

        for (let i = 0; i < assertions.length; i++){
            if (assertions[i] != values[i]){
                return false
            }
        }
        return true
    }
    const buildAndRun = (c) => {
        if (!c.description || !c.code || !c.assertions) {
            throw new Error(`A test case must at least feature a 'describe', a 'code' and an 'assert' section!`)
        }
        // enforce the use of a local asm instance
        process.env.CSCP_ASM = 'as'
        console.log(`${TAB}${c.description}`)

        const input = c.input ? c.input : [undefined]

        try {
            assemble(c.code, { out: 'asm', reset: true })
        } catch(e) {
            const msg = formatFail(`compilation error:
${TAB}${TAB}${TAB}${e.message}${EOL}`)
            console.error(msg)
            return [ 0, input.length, 0 ]
        }
        let pass = 0, fail = 0, time = 0

        for (let i = 0; i < input.length; i++){
            const value = input[i]

            const startTime = Date.now()
            let output = runTest('asm', value)
            time += Date.now() - startTime

            if (output.endsWith(EOL)){
                output = output.substring(0, output.length - 1)
            }
            const values = output == '' ? [] : output.split(EOL)

            if (checkAssertions(c.assertions[i], values)){
                console.log(formatPass(value == undefined ? '<no input>' : value))
                pass++
            } else {
                const msg = formatFail(`${value}
${TAB}${TAB}${TAB}expected [${c.assertions[i].join(', ')}] got [${values.join(', ')}]`)
                console.error(msg)
                fail++
            }
        }
        console.log()

        return [ pass, fail, time ]
    }

    this.run = function(dir){
        const sourceFiles = discover(dir)
        const testResults = sourceFiles
            .flatMap(f => getTestCases(f))
            .map(buildAndRun)
        
        const [ totalPassed, totalFailed, totalTime ] = testResults.reduce((total, res) => {
            total[0] += res[0]
            total[1] += res[1]
            total[2] += res[2]
            return total
        }, [0, 0, 0])
        console.log(`${EOL}${TAB}${GREEN}${totalPassed} passing${RESET}${totalFailed > 0 ? `${GRAY},${RESET} ${RED}${totalFailed} failing${RESET}`: ''} ${GRAY}(${totalTime}ms)${RESET}${EOL}`)
    }
}

if (!process.argv[2]){
    console.error(`usage: ${path.basename(process.argv[1])} <test-dir>`)
    process.exit(1)
}

if (process.env.CSCP_ASM === 'rasm'){
    console.log(`${YELLOW}Warning:${RESET} the test runner only works with a local installation of 'as'!`)
}
const runner = new TestRunner()
runner.run(process.argv[2])