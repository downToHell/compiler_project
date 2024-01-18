import assert from 'node:assert'
import { Parser } from "../src/parser.mjs"
import { Tokenizer } from "../src/tokenizer.mjs"
import { BinaryExpr, Grouping, Identifier, Literal, LogicalExpr, UnaryExpr } from '../src/ast.mjs'

const makeParser = (inp) => {
    let scn = new Tokenizer(inp)
    return new Parser(scn.tokens())
}

describe('Parser tests', function(){

    it('empty input', function(){
        let parser = makeParser('')
        assert.throws(() => parser.parseExpression())
    })

    it('rejects superfluous input', function(){
        let parser = makeParser('1 + 2 8')
        assert.throws(() => parser.parseExpression())
    })

    it('accepts simple addition', function(){
        let parser = makeParser('1 + 3 - 5')
        let expr = parser.parseExpression()

        assert.ok(expr instanceof BinaryExpr)
        assert.ok(expr.left instanceof BinaryExpr)
        assert.ok(expr.right instanceof Literal)
        assert.ok(expr.left.left instanceof Literal)
        assert.ok(expr.left.right instanceof Literal)
        assert.strictEqual(expr.left.op, '+')
        assert.strictEqual(expr.op, '-')
        assert.strictEqual(expr.left.left.value, 1)
        assert.strictEqual(expr.left.right.value, 3)
        assert.strictEqual(expr.right.value, 5)
    })

    it('accepts simple multiplication', function(){
        let parser = makeParser('1 - 2 * 3')
        let expr = parser.parseExpression()

        assert.ok(expr instanceof BinaryExpr)
        assert.ok(expr.left instanceof Literal)
        assert.ok(expr.right instanceof BinaryExpr)
        assert.ok(expr.right.left instanceof Literal)
        assert.ok(expr.right.right instanceof Literal)
        assert.strictEqual(expr.op, '-')
        assert.strictEqual(expr.right.op, '*')
        assert.strictEqual(expr.left.value, 1)
        assert.strictEqual(expr.right.left.value, 2)
        assert.strictEqual(expr.right.right.value, 3)
    })

    it('accepts grouped expressions', function(){
        let parser = makeParser('(1 - 2) / 3')
        let expr = parser.parseExpression()

        assert.ok(expr instanceof BinaryExpr)
        assert.ok(expr.left instanceof Grouping)
        assert.ok(expr.right instanceof Literal)
        assert.ok(expr.left.expr instanceof BinaryExpr)
        assert.ok(expr.left.expr.left instanceof Literal)
        assert.ok(expr.left.expr.right instanceof Literal)
        assert.strictEqual(expr.op, '/')
        assert.strictEqual(expr.left.expr.op, '-')
        assert.strictEqual(expr.left.expr.left.value, 1)
        assert.strictEqual(expr.left.expr.right.value, 2)
        assert.strictEqual(expr.right.value, 3)
    })

    it('accepts negated expressions', function(){
        let parser = makeParser('-5')
        let expr = parser.parseExpression()

        assert.ok(expr instanceof UnaryExpr)
        assert.ok(expr.right instanceof Literal)
        assert.strictEqual(expr.op, '-')
        assert.strictEqual(expr.right.value, 5)
    })

    it('accepts double negation', function(){
        let parser = makeParser('--8')
        let expr = parser.parseExpression()

        assert.ok(expr instanceof UnaryExpr)
        assert.ok(expr.right instanceof UnaryExpr)
        assert.ok(expr.right.right instanceof Literal)
        assert.strictEqual(expr.op, '-')
        assert.strictEqual(expr.right.op, '-')
        assert.strictEqual(expr.right.right.value, 8)
    })

    it('accepts identifiers in arithmetic op', function(){
        let parser = makeParser('a + b * c')
        let expr = parser.parseExpression()

        assert.ok(expr instanceof BinaryExpr)
        assert.ok(expr.left instanceof Identifier)
        assert.ok(expr.right instanceof BinaryExpr)
        assert.ok(expr.right.left instanceof Identifier)
        assert.ok(expr.right.right instanceof Identifier)
        assert.strictEqual(expr.op, '+')
        assert.strictEqual(expr.right.op, '*')
        assert.strictEqual(expr.left.name, 'a')
        assert.strictEqual(expr.right.left.name, 'b')
        assert.strictEqual(expr.right.right.name, 'c')
    })

    it('accepts logical expressions', function(){
        let parser = makeParser('a or b and c')
        let expr = parser.parseExpression()

        assert.ok(expr instanceof LogicalExpr)
        assert.ok(expr.left instanceof Identifier)
        assert.ok(expr.right instanceof LogicalExpr)
        assert.strictEqual(expr.op, 'or')
        assert.strictEqual(expr.right.op, 'and')
        assert.strictEqual(expr.left.name, 'a')
        assert.strictEqual(expr.right.left.name, 'b')
        assert.strictEqual(expr.right.right.name, 'c')
    })
})