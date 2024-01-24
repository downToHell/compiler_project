import assert from 'node:assert'
import { Parser } from '../src/parser.mjs'
import { Tokenizer } from '../src/tokenizer.mjs'
import { Interpreter } from '../src/interpreter.mjs'
import { SymTab } from '../src/symtab.mjs'

const symtab = new SymTab()
symtab.addSymbol('print_int', (i) => console.log(i))
symtab.addSymbol('print_bool', (b) => console.log(b))

const interpret = (src) => {
    const scn = new Tokenizer(src, { ignoreLoc: true })
    const parser = new Parser(scn.tokens())
    const interpreter = new Interpreter(symtab)
    return interpreter.interpret(parser.parseExpression())
}

describe('Interpreter tests', function(){

    it('evaluates simple arithmetic', function(){
        const value = interpret('1 + 2')
        assert.strictEqual(value, 3)
    })

    it('gets precedence right', function(){
        const value = interpret('1 + 2 * 3')
        assert.strictEqual(value, 7)
    })

    it('evaluates parenthesized expressions', function(){
        const value = interpret('(1 + 2) * 3')
        assert.strictEqual(value, 9)
    })

    it('evaluates variable declaration', function(){
        let value = interpret('var x = 3 / 5')
        assert.strictEqual(value, 0)
    })

    it('evaluates logical operations', function(){
        let value = interpret('3 < 5')
        assert.strictEqual(value, true)

        value = interpret('{ var x = 3;\nx > 2 }')
        assert.strictEqual(value, true)
    })

    it('short-circuits logical ops', function(){
        let value = interpret('3 == 3 or a')
        assert.strictEqual(value, true)

        value = interpret('5 != 5 and b')
        assert.strictEqual(value, false)
    })
})