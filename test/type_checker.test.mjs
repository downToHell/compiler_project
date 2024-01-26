import assert from 'node:assert'
import { Parser } from '../src/parser.mjs'
import { Tokenizer } from '../src/tokenizer.mjs'
import { TypeChecker } from '../src/type_checker.mjs'
import { Int, Unit } from '../src/types.mjs'

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
})