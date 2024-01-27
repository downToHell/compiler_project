import assert from 'node:assert'
import { Parser } from '../src/parser.mjs'
import { Tokenizer } from '../src/tokenizer.mjs'
import { TypeChecker } from '../src/type_checker.mjs'
import { Bool, Int, Unit } from '../src/types.mjs'

const typecheck = (src) => {
    const scn = new Tokenizer(src)
    const parser = new Parser(scn.tokens())
    const typechecker = new TypeChecker()
    return typechecker.typecheck(parser.parseExpression())
}

describe('Typechecker tests', function(){
    it('typechecks simple addition', function(){
        assert.ok(typecheck('1 + 2') === Int)
    })

    it('rejects invalid arithmetics', function(){
        assert.throws(() => typecheck('1 + true'))
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
})