import assert from 'node:assert'
import { expect } from './tree_tester.mjs'
import { Parser } from '../src/parser.mjs'
import { Tokenizer } from '../src/tokenizer.mjs'

const makeParser = (inp) => {
    let scn = new Tokenizer(inp)
    return new Parser(scn.tokens())
}

describe('Parser tests', function(){

    it('empty input', function(){
        let parser = makeParser('')
        assert.throws(() => parser.parse())
    })

    it('rejects superfluous input', function(){
        let parser = makeParser('1 + 2 8')
        assert.throws(() => parser.parse())
    })

    it('accepts multiple top-level expressions', function(){
        let parser = makeParser('1 + 2; 3 * 4')
        assert.doesNotThrow(() => parser.parse())
    })

    it('accepts simple addition', function(){
        let parser = makeParser('1 + 3 - 5')
        let expr = expect(parser.parse().first())

        expr.isBinaryExpr()
            .hasOperator('-')
            .andLeft(left => {
                left.isBinaryExpr()
                    .hasOperator('+')
                    .andLeft(left => left.isLiteral().hasValue(1))
                    .andRight(right => right.isLiteral().hasValue(3))
            })
            .andRight(right => right.isLiteral().hasValue(5))
    })

    it('accepts simple multiplication', function(){
        let parser = makeParser('1 - 2 * 3')
        let expr = expect(parser.parse().first())

        expr.isBinaryExpr()
            .hasOperator('-')
            .andLeft(left => left.isLiteral().hasValue(1))
            .andRight(right => {
                right.isBinaryExpr()
                    .hasOperator('*')
                    .andLeft(left => left.isLiteral().hasValue(2))
                    .andRight(right => right.isLiteral().hasValue(3))
            })
    })

    it('accepts power expressions', function(){
        let parser = makeParser('1 + 2 * 3 ** 5')
        let expr = expect(parser.parse().first())

        expr.isBinaryExpr()
            .hasOperator('+')
            .andLeft(left => left.isLiteral().hasValue(1))
            .andRight(right => {
                right.isBinaryExpr()
                    .hasOperator('*')
                    .andLeft(left => left.isLiteral().hasValue(2))
                    .andRight(right => {
                        right.isBinaryExpr()
                            .hasOperator('**')
                            .andLeft(left => left.isLiteral().hasValue(3))
                            .andRight(right => right.isLiteral().hasValue(5))
                    })
            })
    })

    it('accepts grouped expressions', function(){
        let parser = makeParser('(1 - 2) / 3')
        let expr = expect(parser.parse().first())

        expr.isBinaryExpr()
            .hasOperator('/')
            .andLeft(left => left.isGrouping().andExpr(expr => {
                expr.isBinaryExpr()
                    .hasOperator('-')
                    .andLeft(left => left.isLiteral().hasValue(1))
                    .andRight(right => right.isLiteral().hasValue(2))
            }))
            .andRight(right => right.isLiteral().hasValue(3))
    })

    it('accepts negated expressions', function(){
        let parser = makeParser('-5')
        let expr = expect(parser.parse().first())

        expr.isUnaryExpr()
            .hasOperator('-')
            .andRight(right => right.isLiteral().hasValue(5))
    })

    it('accepts double negation', function(){
        let parser = makeParser('not not 8')
        let expr = expect(parser.parse().first())

        expr.isUnaryExpr()
            .hasOperator('not')
            .andRight(right => {
                right.isUnaryExpr()
                    .hasOperator('not')
                    .andRight(right => right.isLiteral().hasValue(8))
            })
    })

    it('accepts identifiers in arithmetic op', function(){
        let parser = makeParser('a + b * c')
        let expr = expect(parser.parse().first())

        expr.isBinaryExpr()
            .hasOperator('+')
            .andLeft(left => left.isIdentifier().hasName('a'))
            .andRight(right => {
                right.isBinaryExpr()
                    .hasOperator('*')
                    .andLeft(left => left.isIdentifier().hasName('b'))
                    .andRight(right => right.isIdentifier().hasName('c'))
            })
    })

    it('accepts logical expressions', function(){
        let parser = makeParser('a or b and c')
        let expr = expect(parser.parse().first())

        expr.isLogicalExpr()
            .hasOperator('or')
            .andLeft(left => left.isIdentifier().hasName('a'))
            .andRight(right => {
                right.isLogicalExpr()
                    .hasOperator('and')
                    .andLeft(left => left.isIdentifier().hasName('b'))
                    .andRight(right => right.isIdentifier().hasName('c'))
            })
    })

    it('accepts comparison', function(){
        let parser = makeParser('a < b and b != c')
        let expr = expect(parser.parse().first())

        expr.isLogicalExpr()
            .hasOperator('and')
            .andLeft(left => {
                left.isLogicalExpr()
                    .hasOperator('<')
                    .andLeft(left => left.isIdentifier().hasName('a'))
                    .andRight(right => right.isIdentifier().hasName('b'))
            })
            .andRight(right => {
                right.isLogicalExpr()
                    .hasOperator('!=')
                    .andLeft(left => left.isIdentifier().hasName('b'))
                    .andRight(right => right.isIdentifier().hasName('c'))
            })
    })

    it('accepts assignment expression', function(){
        let parser = makeParser('x = 3 + 5')
        let expr = expect(parser.parse().first())

        expr.isAssignment()
            .andTarget(target => target.isIdentifier().hasName('x'))
            .andExpr(expr => {
                expr.isBinaryExpr()
                    .hasOperator('+')
                    .andLeft(left => left.isLiteral().hasValue(3))
                    .andRight(right => right.isLiteral().hasValue(5))
            })
    })

    it('rejects invalid assignment', function(){
        let parser = makeParser('3 = 5')
        assert.throws(() => parser.parse())
    })

    it('accepts if expressions', function(){
        let parser = makeParser('if true then b + c else x * y')
        let expr = expect(parser.parse().first())

        expr.isIfExpr()
            .andCond(cond => cond.isLiteral().hasValue(true))
            .andBody(body => {
                body.isBinaryExpr()
                    .hasOperator('+')
                    .andLeft(left => left.isIdentifier().hasName('b'))
                    .andRight(right => right.isIdentifier().hasName('c'))
            })
            .andElse(elsz => {
                elsz.isBinaryExpr()
                    .hasOperator('*')
                    .andLeft(left => left.isIdentifier().hasName('x'))
                    .andRight(right => right.isIdentifier().hasName('y'))
            })
    })

    it('treats else as optional', function(){
        let parser = makeParser('if a then a + 5')
        let expr = expect(parser.parse().first())

        expr.isIfExpr()
            .andCond(cond => cond.isIdentifier().hasName('a'))
            .andElse(elsz => elsz.isUndefined())
    })

    it('treats everything as an expression', function(){
        let parser = makeParser('1 + if true then 2 else 3')
        assert.doesNotThrow(() => parser.parse().first())
    })

    it('rejects assignment in if', function(){
        let parser = makeParser('if a = b then x + y')
        assert.throws(() => parser.parse())
    })

    it('accepts function calls', function(){
        let parser = makeParser('f(x, y + z)')
        let expr = expect(parser.parse().first())
        
        expr.isCall()
            .andTarget(target => target.isIdentifier().hasName('f'))
            .andArgAt(1, arg => arg.isBinaryExpr())
    })

    it('accepts variable declaration', function(){
        let parser = makeParser('var x = 123 + 4')
        let expr = expect(parser.parse().first())

        expr.isVarDecl()
            .andIdent(ident => ident.isIdentifier().hasName('x'))
            .andInitializer(init => init.isBinaryExpr())
    })

    it('accepts typed variable', function(){
        let parser = makeParser('var x: Int = true')
        let expr = expect(parser.parse().first())

        expr.isVarDecl()
            .andIdent(ident => ident.isIdentifier().hasName('x'))
            .andInitializer(init => {
                init.isTypeExpr()
                    .andType(type => type.isIdentifier().hasName('Int'))
                    .andExpr(expr => expr.isLiteral().hasValue(true))
            })
    })

    it('treats declaration as expression', function(){
        let parser = makeParser('(var x = 123) + 7')
        let expr = expect(parser.parse().first())

        expr.isBinaryExpr()
            .hasOperator('+')
            .andLeft(left => left.isGrouping())
            .andRight(right => right.isLiteral())
    })

    it('rejects declaration without initializer', function(){
        let parser = makeParser('var x')
        assert.throws(() => parser.parse())
    })

    it('rejects invalid var identifier', function(){
        let parser = makeParser('var 3 = 5')
        assert.throws(() => parser.parse())
    })

    it('accepts empty block', function(){
        let parser = makeParser('{ }')
        assert.doesNotThrow(() => parser.parse())
    })

    it('accepts simple block', function(){
        let parser = makeParser('{ f(a); x = y; f(x) }')
        let expr = expect(parser.parse().first())

        expr.isBlock()
            .andExprAt(2, expr => expr.isCall())
    })

    it('accepts optional semicolon after block', function(){
        let parser = makeParser('{ a = b + c; }')
        let expr = expect(parser.parse().first())
        
        expr.isBlock()
            .andExprAt(1, lit => lit.isLiteral().hasValue(null))
    })

    it('accepts complex blocks', function(){
        let parser = makeParser('{ { a } { b } }')
        assert.doesNotThrow(() => parser.parse())

        parser = makeParser('{ a b }')
        assert.throws(() => parser.parse())

        parser = makeParser('{ if true then { a } b }')
        assert.doesNotThrow(() => parser.parse())

        parser = makeParser('{ if true then { a }; b }')
        assert.doesNotThrow(() => parser.parse())

        parser = makeParser('{ if true then { a } b c')
        assert.throws(() => parser.parse())

        parser = makeParser('{ if true then { a } b; c }')
        assert.doesNotThrow(() => parser.parse())

        parser = makeParser('{ if true then { a } else { b } 3 }')
        assert.doesNotThrow(() => parser.parse())

        parser = makeParser('x = { { f(a) } { b } }')
        assert.doesNotThrow(() => parser.parse())
    })

    it('accepts while loops', function(){
        let parser = makeParser('while true do { x = x + 1; print_int(x) }')
        let expr = expect(parser.parse().first())

        expr.isWhileExpr()
            .andCond(cond => cond.isLiteral())
            .andBody(body => body.isBlock().andExprAt(1, expr => expr.isCall()))
    })

    it('accepts simple function declaration', function(){
        let parser = makeParser('fun square(x: Int): Int = x * x')
        let expr = expect(parser.parse().first())

        expr.isFunDecl()
            .andIdent(ident => ident.isIdentifier().hasName('square'))
            .andRetType(ret => ret.isIdentifier().hasName('Int'))
            .andArgAt(0, expr => {
                expr.isTypeExpr()
                    .andType(type => type.isIdentifier().hasName('Int'))
                    .andExpr(expr => expr.isIdentifier().hasName('x'))
            })
    })

    it('accepts no-arg function', function(){
        let parser = makeParser('fun print_twice(): Unit { print_int(1); print_int(2); }')
        assert.doesNotThrow(() => parser.parse())
    })

    it('accepts multi-arg function', function(){
        let parser = makeParser('fun logical_or(a: Bool, b: Bool): Bool = a or b')
        let expr = expect(parser.parse().first())

        expr.isFunDecl()
            .andIdent(ident => ident.isIdentifier().hasName('logical_or'))
            .andRetType(ret => ret.isIdentifier().hasName('Bool'))
            .andArgAt(0, expr => {
                expr.isTypeExpr()
                    .andType(type => type.isIdentifier().hasName('Bool'))
                    .andExpr(expr => expr.isIdentifier().hasName('a'))
            })
            .andArgAt(1, expr => {
                expr.isTypeExpr()
                    .andType(type => type.isIdentifier().hasName('Bool'))
                    .andExpr(expr => expr.isIdentifier().hasName('b'))
            })
    })

    it('accepts return expressions', function(){
        let parser = makeParser('fun fib(n: Int): Int { if n <= 1 then return n; return fib(n - 2) + fib(n - 1) }')
        let expr = expect(parser.parse().first())

        expr.isFunDecl()
            .andIdent(ident => ident.isIdentifier().hasName('fib'))
            .andRetType(ret => ret.isIdentifier().hasName('Int'))
            .andArgAt(0, expr => expr.isTypeExpr())
            .andBody(body => {
                body.isBlock()
                    .andExprAt(0, expr => {
                        expr.isIfExpr()
                            .andBody(body => body.isReturn().andValue(val => val.isIdentifier()))
                    })
                    .andExprAt(1, expr => {
                        expr.isReturn().andValue(val => val.isBinaryExpr())
                    })
            })
    })

    it('inserts implicit return correctly', function(){
        let parser = makeParser('fun doTest(x: Int): Int { if x == 0 then { return 2; } 3 }')
        let expr = expect(parser.parse().first())

        expr.isFunDecl()
            .andBody(body => {
                body.isBlock()
                    .andExprAt(1, expr => {
                        expr.isReturn().andValue(val => val.isLiteral())
                    })
            })
        parser = makeParser('fun doTest(y: Int): Int { if y == 0 then { return 2; } 3; }');
        expr = expect(parser.parse().first())

        expr.isFunDecl()
            .andBody(body => {
                body.isBlock()
                    .andExprAt(2, expr => {
                        expr.isReturn().andValue(val => val.isLiteral().hasValue(null))
                    })
            })
        parser = makeParser('fun odd(x: Int): Bool = if x % 2 == 0 then true else false')
        expr = expect(parser.parse().first())

        expr.isFunDecl()
            .andBody(body => {
                body.isReturn()
                    .andValue(val => {
                        val.isIfExpr()
                            .andBody(body => body.isLiteral().hasValue(true))
                            .andElse(elsz => elsz.isLiteral().hasValue(false))
                    })
            })
    })

    it('rejects top-level return expressions', function(){
        let parser = makeParser('return 1')
        assert.throws(() => parser.parse())
    })

    it('rejects functions without return type', function(){
        let parser = makeParser('fun no_ret() = print_int(1)')
        assert.throws(() => parser.parse())
    })

    it('rejects untyped arguments', function(){
        let parser = makeParser('fun sum(a, b): Int = a + b')
        assert.throws(() => parser.parse())
    })

    it('rejects trailing comma in function declaration', function(){
        let parser = makeParser('fun invalid_args(a: Int, b: Int,): Int = a and b')
        assert.throws(() => parser.parse())
    })
})