import assert from 'node:assert'
import { expect } from './tree_tester.mjs'
import { Parser } from '../src/parser.mjs'
import { Tokenizer } from '../src/tokenizer.mjs'

const makeParser = (inp) => {
    const scn = new Tokenizer(inp)
    return new Parser(scn.tokens())
}
const parse = (inp, callback) => {
    const parser = makeParser(inp)
    const res = parser.parse()
    if (callback) callback(res)
}

describe('Parser tests', function(){

    it('empty input', function(){
        assert.throws(() => parse(''))
    })

    it('rejects superfluous input', function(){
        assert.throws(() => parse('1 + 2 8'))
    })

    it('accepts multiple top-level expressions', function(){
        assert.doesNotThrow(() => parse('1 + 2; 3 * 4'))
    })

    it('accepts simple addition', function(){
        parse('1 + 3 - 5', expr => {
            expect(expr.first())
                .isBinaryExpr()
                .hasOperator('-')
                .andLeft(left => {
                    left.isBinaryExpr()
                        .hasOperator('+')
                        .andLeft(left => left.isLiteral().hasValue(1))
                        .andRight(right => right.isLiteral().hasValue(3))
                })
                .andRight(right => right.isLiteral().hasValue(5))
        })
    })

    it('accepts simple multiplication', function(){
        parse('1 - 2 * 3', expr => {
            expect(expr.first())
                .isBinaryExpr()
                .hasOperator('-')
                .andLeft(left => left.isLiteral().hasValue(1))
                .andRight(right => {
                    right.isBinaryExpr()
                        .hasOperator('*')
                        .andLeft(left => left.isLiteral().hasValue(2))
                        .andRight(right => right.isLiteral().hasValue(3))
                })
        })
    })

    it('accepts power expressions', function(){
        parse('1 + 2 * 3 ** 5', expr => {
            expect(expr.first())
                .isBinaryExpr()
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
    })

    it('accepts grouped expressions', function(){
        parse('(1 - 2) / 3', expr => {
            expect(expr.first())
                .isBinaryExpr()
                .hasOperator('/')
                .andLeft(left => left.isGrouping().andExpr(expr => {
                    expr.isBinaryExpr()
                        .hasOperator('-')
                        .andLeft(left => left.isLiteral().hasValue(1))
                        .andRight(right => right.isLiteral().hasValue(2))
                }))
                .andRight(right => right.isLiteral().hasValue(3))
        })
    })

    it('accepts negated expressions', function(){
        parse('-5', expr => {
            expect(expr.first())
                .isUnaryExpr()
                .hasOperator('-')
                .andRight(right => right.isLiteral().hasValue(5))
        })
    })

    it('accepts double negation', function(){
        parse('not not 8', expr => {
            expect(expr.first())
                .isUnaryExpr()
                .hasOperator('not')
                .andRight(right => {
                    right.isUnaryExpr()
                        .hasOperator('not')
                        .andRight(right => right.isLiteral().hasValue(8))
                })
        })
    })

    it('accepts identifiers in arithmetic op', function(){
        parse('a + b * c', expr => {
            expect(expr.first())
                .isBinaryExpr()
                .hasOperator('+')
                .andLeft(left => left.isIdentifier().hasName('a'))
                .andRight(right => {
                    right.isBinaryExpr()
                        .hasOperator('*')
                        .andLeft(left => left.isIdentifier().hasName('b'))
                        .andRight(right => right.isIdentifier().hasName('c'))
                })
        })
    })

    it('accepts logical expressions', function(){
        parse('a or b and c', expr => {
            expect(expr.first())
                .isLogicalExpr()
                .hasOperator('or')
                .andLeft(left => left.isIdentifier().hasName('a'))
                .andRight(right => {
                    right.isLogicalExpr()
                        .hasOperator('and')
                        .andLeft(left => left.isIdentifier().hasName('b'))
                        .andRight(right => right.isIdentifier().hasName('c'))
                })
        })
    })

    it('accepts comparison', function(){
        parse('a < b and b != c', expr => {
            expect(expr.first())
                .isLogicalExpr()
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
    })

    it('accepts assignment expression', function(){
        parse('x = 3 + 5', expr => {
            expect(expr.first())
                .isAssignment()
                .andTarget(target => target.isIdentifier().hasName('x'))
                .andExpr(expr => {
                    expr.isBinaryExpr()
                        .hasOperator('+')
                        .andLeft(left => left.isLiteral().hasValue(3))
                        .andRight(right => right.isLiteral().hasValue(5))
                })
        })
    })

    it('rejects invalid assignment', function(){
        assert.throws(() => parse('3 = 5'))
    })

    it('accepts if expressions', function(){
        parse('if true then b + c else x * y', expr => {
            expect(expr.first())
                .isIfExpr()
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
    })

    it('treats else as optional', function(){
        parse('if a then a + 5', expr => {
            expect(expr.first())
                .isIfExpr()
                .andCond(cond => cond.isIdentifier().hasName('a'))
                .andElse(elsz => elsz.isUndefined())
        })
    })

    it('treats everything as an expression', function(){
        assert.doesNotThrow(() => parse('1 + if true then 2 else 3'))
    })

    it('rejects assignment in if', function(){
        assert.throws(() => parse('if a = b then x + y'))
    })

    it('accepts function calls', function(){
        parse('f(x, y + z)', expr => {
            expect(expr.first())
                .isCall()
                .andTarget(target => target.isIdentifier().hasName('f'))
                .andArgAt(1, arg => arg.isBinaryExpr())
        })
    })

    it('accepts variable declaration', function(){
        parse('var x = 123 + 4', expr => {
            expect(expr.first())
                .isVarDecl()
                .andIdent(ident => ident.isIdentifier().hasName('x'))
                .andInitializer(init => init.isBinaryExpr())
        })
    })

    it('accepts typed variable', function(){
        parse('var x: Int = true', expr => {
            expect(expr.first())
                .isVarDecl()
                .andIdent(ident => ident.isIdentifier().hasName('x'))
                .andInitializer(init => {
                    init.isTypeExpr()
                        .andType(type => type.isIdentifier().hasName('Int'))
                        .andExpr(expr => expr.isLiteral().hasValue(true))
                })
        })
    })

    it('treats declaration as expression', function(){
        parse('(var x = 123) + 7', expr => {
            expect(expr.first())
                .isBinaryExpr()
                .hasOperator('+')
                .andLeft(left => left.isGrouping())
                .andRight(right => right.isLiteral())
        })
    })

    it('rejects declaration without initializer', function(){
        assert.throws(() => parse('var x'))
    })

    it('rejects invalid var identifier', function(){
        assert.throws(() => parse('var 3 = 5'))
    })

    it('accepts empty block', function(){
        assert.doesNotThrow(() => parse('{ }'))
    })

    it('accepts simple block', function(){
        parse('{ f(a); x = y; f(x) }', expr => {
            expect(expr.first())
                .isBlock()
                .andExprAt(2, expr => expr.isCall())
        })
    })

    it('accepts optional semicolon after block', function(){
        parse('{ a = b + c; }', expr => {
            expect(expr.first())
                .isBlock()
                .andExprAt(1, lit => lit.isLiteral().hasValue(null))
        })
    })

    it('accepts complex blocks', function(){
        assert.doesNotThrow(() => parse('{ { a } { b } }'))
        assert.throws(() => parse('{ a b }'))
        assert.doesNotThrow(() => parse('{ if true then { a } b }'))
        assert.doesNotThrow(() => parse('{ if true then { a }; b }'))
        assert.throws(() => parse('{ if true then { a } b c'))
        assert.doesNotThrow(() => parse('{ if true then { a } b; c }'))
        assert.doesNotThrow(() => parse('{ if true then { a } else { b } 3 }'))
        assert.doesNotThrow(() => parse('x = { { f(a) } { b } }'))
    })

    it('accepts while loops', function(){
        parse('while true do { x = x + 1; print_int(x) }', expr => {
            expect(expr.first())
                .isWhileExpr()
                .andCond(cond => cond.isLiteral())
                .andBody(body => body.isBlock().andExprAt(1, expr => expr.isCall()))
        })
    })

    it('accepts simple function declaration', function(){
        parse('fun square(x: Int): Int = x * x', expr => {
            expect(expr.first())
                .isFunDecl()
                .andIdent(ident => ident.isIdentifier().hasName('square'))
                .andRetType(ret => ret.isIdentifier().hasName('Int'))
                .andArgAt(0, expr => {
                    expr.isTypeExpr()
                        .andType(type => type.isIdentifier().hasName('Int'))
                        .andExpr(expr => expr.isIdentifier().hasName('x'))
                })
        })
    })

    it('accepts no-arg function', function(){
        assert.doesNotThrow(() => parse('fun print_twice(): Unit { print_int(1); print_int(2); }'))
    })

    it('accepts multi-arg function', function(){
        parse('fun logical_or(a: Bool, b: Bool): Bool = a or b', expr => {
            expect(expr.first())
                .isFunDecl()
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
    })

    it('accepts return expressions', function(){
        parse('fun fib(n: Int): Int { if n <= 1 then return n; return fib(n - 2) + fib(n - 1) }', expr => {
            expect(expr.first())
                .isFunDecl()
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
    })

    it('inserts implicit return correctly', function(){
        parse('fun noop(): Unit {}', expr => {
            expect(expr.first())
                .isFunDecl()
                .andBody(body => body.isBlock().andExprAt(0, expr => expr.isReturn()))
        })

        parse('fun sum(a: Int, b: Int): Int = { a + b }', expr => {
            expect(expr.first())
                .isFunDecl()
                .andBody(body => {
                    body.isReturn()
                        .andValue(val => {
                            val.isBlock()
                                .andExprAt(0, expr => expr.isBinaryExpr())
                        })
                })
        })
        
        parse('fun even(i: Int): Bool = if i % 2 == 0 then true else false', expr => {
            expect(expr.first())
                .isFunDecl()
                .andBody(body => {
                    body.isReturn()
                        .andValue(val => {
                            val.isIfExpr()
                                .andBody(body => body.isLiteral().hasValue(true))
                                .andElse(elsz => elsz.isLiteral().hasValue(false))
                        })
                })
        })

        parse('fun odd(j: Int): Bool = if j % 2 == 0 then { false } else { true }', expr => {
            expect(expr.first())
                .isFunDecl()
                .andBody(body => {
                    body.isReturn()
                        .andValue(val => {
                            val.isIfExpr()
                                .andBody(body => body.isBlock().andExprAt(0, expr => expr.isLiteral()))
                                .andElse(elsz => elsz.isBlock().andExprAt(0, expr => expr.isLiteral()))
                        })
                })
        })

        parse('fun even(i: Int): Bool { return if i % 2 == 0 then true else false }', expr => {
            expect(expr.first())
                .isFunDecl()
                .andBody(body => {
                    body.isBlock()
                        .andExprAt(0, expr => {
                            expr.isReturn()
                                .andValue(val => {
                                    val.isIfExpr()
                                        .andBody(body => body.isLiteral().hasValue(true))
                                        .andElse(elsz => elsz.isLiteral().hasValue(false))
                                })
                        })
                })
        })

        parse('fun odd(j: Int): Bool { if j % 2 == 0 then { return false } else { return true } }', expr => {
            expect(expr.first())
                .isFunDecl()
                .andBody(body => {
                    body.isBlock()
                        .andExprAt(0, expr => {
                            expr.isIfExpr()
                                .andBody(body => body.isBlock().andExprAt(0, expr => expr.isReturn()))
                                .andElse(elsz => elsz.isBlock().andExprAt(0, expr => expr.isReturn()))
                        })
                })
        })
    })

    it('rejects top-level return expressions', function(){
        assert.throws(() => parse('return 1'))
    })

    it('rejects functions without return type', function(){
        assert.throws(() => parse('fun no_ret() = print_int(1)'))
    })

    it('rejects untyped arguments', function(){
        assert.throws(() => parse('fun sum(a, b): Int = a + b'))
    })

    it('rejects trailing comma in function declaration', function(){
        assert.throws(() => parse('fun invalid_args(a: Int, b: Int,): Int = a and b'))
    })
})