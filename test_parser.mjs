import { EOL } from 'os'
import { isLetter } from './src/tokenizer.mjs'
import { SourceContext } from './src/source_context.mjs'

const COMMAND_PREFIX = '#'

export const parse = (src) => {
    const lines = src.split(EOL)
    let ctx

    const expect = (ch) => {
        if (!ctx.consume(ch)){
            throw new Error(`${ctx.loc()}: Expected '${ch}', got '${ctx.peek()}'`)
        }
    }
    const parseCommand = (line) => {
        if (!line.startsWith(COMMAND_PREFIX)){
            return null
        }
        ctx = new SourceContext(line.substring(COMMAND_PREFIX.length))
        let buf = ''

        while (!ctx.isEOF()){
            const ch = ctx.peek()

            if (isLetter(ch)){
                buf += ch
            } else if (ch != ' '){
                break
            }
            ctx.advance()
        }
        return buf
    }
    const parseValue = () => {
        let buf = ''

        while (!ctx.isEOF() && !ctx.consume(',') && !ctx.match(')') && !ctx.match(']')){
            if (ctx.consume(' ')){
                continue
            }
            buf += ctx.advance()
        }
        return buf
    }
    const describe = () => {
        expect('(')
        let buf = ''

        while (!ctx.isEOF() && !ctx.match(')')){
            buf += ctx.advance()
        }
        expect(')')
        return buf
    }
    const input = () => {
        expect('(')
        const res = []

        while (!ctx.isEOF() && !ctx.match(')')){
            res.push(parseValue())
        }
        expect(')')
        return res
    }
    const assert = () => {
        expect('(')
        const res = []

        while (!ctx.isEOF() && !ctx.match(')')){
            if (ctx.consume('[')){
                let arr = []
                while (!ctx.isEOF() && !ctx.match(']')){
                    arr.push(parseValue())
                }
                expect(']')
                ctx.consume(',')
                res.push(arr)
            } else if (ctx.consume(' ')) {
                continue
            } else {
                res.push([parseValue()])
            }
        }
        expect(')')
        return res
    }
    const out = {}
    const code = []

    for (const line of lines){
        const cmd = parseCommand(line)

        if (cmd) {
            switch(cmd){
                case 'describe': out.description = describe(); break
                case 'assert': out.assertions = assert(); break
                case 'input': out.input = input(); break
                default: {
                    throw new Error(`${ctx.loc()}: Invalid command: ${cmd}`)
                }
            }
        } else {
            code.push(line)
        }
    }
    out.code = code.join(EOL)
    return out
}