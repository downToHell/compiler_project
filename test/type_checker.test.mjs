import assert from 'node:assert'
import { Parser } from '../src/parser.mjs'
import { Tokenizer } from '../src/tokenizer.mjs'
import { TypeChecker } from '../src/type_checker.mjs'
import { Bool, FunType, Int, Unit } from '../src/types.mjs'

const typecheck = (src) => {
    const scn = new Tokenizer(src)
    const parser = new Parser(scn.tokens())
    const typechecker = new TypeChecker()
    return typechecker.typecheck(parser.parse().first())
}

describe('Typechecker tests', function(){
    it('typechecks simple addition', function(){
        assert.ok(typecheck('1 + 2') === Int)
    })

    it('rejects invalid arithmetics', function(){
        assert.throws(() => typecheck('1 + true'))
    })

    it('typechecks unary expressions', function(){
        assert.ok(typecheck('not true') == Bool)
        assert.ok(typecheck('-3') == Int)
        assert.ok(typecheck('1+-5') == Int)
    })

    it('rejects invalid unary expressions', function(){
        assert.throws(() => typecheck('not 5'))
        assert.throws(() => typecheck('-true'))
    })

    it('typechecks logical expressions', function(){
        assert.ok(typecheck('3 != 3 or 3 < 5') === Bool)
    })

    it('rejects invalid logical operands', function(){
        assert.throws(() => typecheck('5 + 3 and true'))
    })

    it('typechecks simple if-expression', function(){
        assert.ok(typecheck('if true then 3') === Unit)
    })

    it('typechecks if-else expression', function(){
        assert.ok(typecheck('if 1 < 3 then 1 else 3') === Int)
    })

    it('rejects unmatched if-else types', function(){
        assert.throws(() => typecheck('if 1 == 1 then true else 3'))
    })

    it('typechecks variable declaration', function(){
        assert.ok(typecheck('{ var x = 3; x }') === Int)
    })

    it('typechecks variable assignment', function(){
        assert.ok(typecheck('{ var x = 3; x = 5 }') === Int)
    })

    it('rejects reassignment with differing type', function(){
        assert.throws(() => typecheck('{ var x = 3; x = true }'))
    })

    it('rejects unscoped variable', function(){
        assert.throws(() => typecheck('{ var x = 3; { var y = 0 } y }'))
    })

    it('typechecks typed variable', function(){
        assert.ok(typecheck('var x: Int = 5 + 6') === Int)
        assert.ok(typecheck('var y: Bool = true') === Bool)
        assert.ok(typecheck('var z: Unit = while 2 > 5 do print_int(1)') === Unit)
    })

    it('rejects invalid type expression', function(){
        assert.throws(() => typecheck('var x: Int = true'))
        assert.throws(() => typecheck('var y: Bool = 1'))
        assert.throws(() => typecheck('var z: Unit = if 3 then 2 else 1'))
    })

    it('typechecks built-in function calls', function(){
        assert.ok(typecheck('print_int(3)') === Unit)
        assert.ok(typecheck('{ var x = 3; print_int(x) }') === Unit)
    })

    it('rejects invalid function calls', function(){
        assert.throws(() => typecheck('print_int()'))
        assert.throws(() => typecheck('print_int(true)'))
        assert.throws(() => typecheck('print_bool(3)'))
        assert.throws(() => typecheck('print_int(while 3 < 5 do 3)'))
    })

    it('typechecks simple function declarations', function(){
        let res = typecheck('fun square(x: Int): Int = x * x')
        assert.ok(res instanceof FunType)
        assert.strictEqual(res.args.length, 1)
        assert.ok(res.args[0] === Int)
        assert.ok(res.ret === Int)

        res = typecheck('fun print_int_twice(x: Int): Unit { print_int(x); print_int(x); }')
        assert.ok(res instanceof FunType)
        assert.strictEqual(res.args.length, 1)
        assert.ok(res.args[0] === Int)
        assert.ok(res.ret === Unit)
    })
})