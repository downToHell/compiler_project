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
    return interpreter.interpret(parser.parse().first())
}

describe('Interpreter tests', function(){

    it('rejects empty expression', function(){
        assert.throws(() => interpret(''))
    })

    it('evaluates simple arithmetic', function(){
        const value = interpret('1 + 2')
        assert.strictEqual(value, 3)
    })

    it('gets precedence right', function(){
        const value = interpret('1 + 2 * 3 ** 5')
        assert.strictEqual(value, 487)
    })

    it('evaluates parenthesized expressions', function(){
        const value = interpret('(1 + 2) * 3')
        assert.strictEqual(value, 9)
    })

    it('evaluates variable declaration', function(){
        let value = interpret('var x = 3 / 5')
        assert.strictEqual(value, 0)
    })

    it('evaluates block expressions', function(){
        let value = interpret('{ var x = 5; x + 10 }')
        assert.strictEqual(value, 15)

        value = interpret('{ var y = 5; y + 10; }')
        assert.strictEqual(value, null)
    })

    it('evaluates logical operations', function(){
        let value = interpret('3 < 5')
        assert.strictEqual(value, true)

        value = interpret('{ var x = 3; x > 2 }')
        assert.strictEqual(value, true)
    })

    it('short-circuits logical ops', function(){
        let value = interpret('3 == 3 or a')
        assert.strictEqual(value, true)

        value = interpret('5 != 5 and b')
        assert.strictEqual(value, false)
    })

    it('evaluates if-then-else expressions', function(){
        let value = interpret('if 3 < 4 then 1 else 0')
        assert.strictEqual(value, 1)

        value = interpret('if false or 3 + 2 == 5 then 666 else 444')
        assert.strictEqual(value, 666)

        value = interpret('if 3 > 4 then 3 else 4')
        assert.strictEqual(value, 4)

        value = interpret('if 3 == 5 then 0')
        assert.strictEqual(value, null)
    })

    it('rejects assignment in if', function(){
        assert.throws(() => interpret('{ var x = 3; if x = 5 then print_int(3) }'))
    })

    it('evaluates while expressions', function(){
        const value = interpret('{ var y = 0; while y < 5 do y = y + 1; y } ')
        assert.strictEqual(value, 5)
    })

    it('rejects unscoped variable', function(){
        assert.throws(() => interpret('{ var x = 3; { var y = 0; } y }'))
    })

    it('evaluates function declarations', function(){
        const value = interpret('{ fun square(x: Int): Int = x * x; square(4) }')
        assert.strictEqual(value, 16)
    })
})