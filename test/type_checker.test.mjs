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
        const type = typecheck('1 + 2')
        assert.ok(type === Int)
    })

    it('rejects invalid arithmetics', function(){
        assert.throws(() => typecheck('1 + true'))
    })

    it('typechecks logical expressions', function(){
        const type = typecheck('3 != 3 or 3 < 5')
        assert.ok(type === Bool)
    })

    it('rejects invalid logical operands', function(){
        assert.throws(() => typecheck('5 + 3 and true'))
    })

    it('typechecks simple if-expression', function(){
        const type = typecheck('if true then 3')
        assert.ok(type === Unit)
    })

    it('typechecks if-else expression', function(){
        const type = typecheck('if 1 < 3 then 1 else 3')
        assert.ok(type === Int)
    })

    it('rejects unmatched if-else types', function(){
        assert.throws(() => typecheck('if 1 == 1 then true else 3'))
    })

    it('typechecks variable declaration', function(){
        const type = typecheck('{ var x = 3; x }')
        assert.ok(type === Int)
    })

    it('typechecks variable assignment', function(){
        const type = typecheck('{ var x = 3; x = 5 }')
        assert.ok(type === Int)
    })

    it('rejects reassignment with differing type', function(){
        assert.throws(() => typecheck('{ var x = 3; x = true }'))
    })

    it('rejects unscoped variable', function(){
        assert.throws(() => typecheck('{ var x = 3; { var y = 0 } y }'))
    })
})