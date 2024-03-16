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
const isLiteral = (value) => {
    return (lit) => (lit = lit.isLiteral()) && value && lit.hasValue(value)
}
const isIdentifier = (name) => {
    return (ident) => (ident = ident.isIdentifier()) && name && ident.hasName(name)
}
const isTypeId = (name) => {
    return (type) => (type = type.isTypeId()) && name && type.andIdent(isIdentifier(name))
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
                        .andLeft(isLiteral(1))
                        .andRight(isLiteral(3))
                })
                .andRight(isLiteral(5))
        })
    })

    it('accepts simple multiplication', function(){
        parse('1 - 2 * 3', expr => {
            expect(expr.first())
                .isBinaryExpr()
                .hasOperator('-')
                .andLeft(isLiteral(1))
                .andRight(right => {
                    right.isBinaryExpr()
                        .hasOperator('*')
                        .andLeft(isLiteral(2))
                        .andRight(isLiteral(3))
                })
        })
    })

    it('accepts power expressions', function(){
        parse('1 + 2 * 3 ** 5', expr => {
            expect(expr.first())
                .isBinaryExpr()
                .hasOperator('+')
                .andLeft(isLiteral(1))
                .andRight(right => {
                    right.isBinaryExpr()
                        .hasOperator('*')
                        .andLeft(isLiteral(2))
                        .andRight(right => {
                            right.isBinaryExpr()
                                .hasOperator('**')
                                .andLeft(isLiteral(3))
                                .andRight(isLiteral(5))
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
                        .andLeft(isLiteral(1))
                        .andRight(isLiteral(2))
                }))
                .andRight(isLiteral(3))
        })
    })

    it('accepts negated expressions', function(){
        parse('-5', expr => {
            expect(expr.first())
                .isUnaryExpr()
                .hasOperator('-')
                .andRight(isLiteral(5))
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
                        .andRight(isLiteral(8))
                })
        })
    })

    it('accepts identifiers in arithmetic op', function(){
        parse('a + b * c', expr => {
            expect(expr.first())
                .isBinaryExpr()
                .hasOperator('+')
                .andLeft(isIdentifier('a'))
                .andRight(right => {
                    right.isBinaryExpr()
                        .hasOperator('*')
                        .andLeft(isIdentifier('b'))
                        .andRight(isIdentifier('c'))
                })
        })
    })

    it('accepts logical expressions', function(){
        parse('a or b and c', expr => {
            expect(expr.first())
                .isLogicalExpr()
                .hasOperator('or')
                .andLeft(isIdentifier('a'))
                .andRight(right => {
                    right.isLogicalExpr()
                        .hasOperator('and')
                        .andLeft(isIdentifier('b'))
                        .andRight(isIdentifier('c'))
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
                        .andLeft(isIdentifier('a'))
                        .andRight(isIdentifier('b'))
                })
                .andRight(right => {
                    right.isLogicalExpr()
                        .hasOperator('!=')
                        .andLeft(isIdentifier('b'))
                        .andRight(isIdentifier('c'))
                })
        })
    })

    it('accepts assignment expression', function(){
        parse('x = 3 + 5', expr => {
            expect(expr.first())
                .isAssignment()
                .andTarget(isIdentifier('x'))
                .andExpr(expr => {
                    expr.isBinaryExpr()
                        .hasOperator('+')
                        .andLeft(isLiteral(3))
                        .andRight(isLiteral(5))
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
                        .andLeft(isIdentifier('b'))
                        .andRight(isIdentifier('c'))
                })
                .andElse(elsz => {
                    elsz.isBinaryExpr()
                        .hasOperator('*')
                        .andLeft(isIdentifier('x'))
                        .andRight(isIdentifier('y'))
                })
        })
    })

    it('treats else as optional', function(){
        parse('if a then a + 5', expr => {
            expect(expr.first())
                .isIfExpr()
                .andCond(isIdentifier('a'))
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
                .andTarget(isIdentifier('f'))
                .andArgAt(1, arg => arg.isBinaryExpr())
        })
        parse('f(x, h())', expr => {
            expect(expr.first())
                .isCall()
                .andTarget(isIdentifier('f'))
                .andArgAt(0, isIdentifier('x'))
                .andArgAt(1, arg => arg.isCall())
        })
    })

    it('accepts variable declaration', function(){
        parse('var x = 123 + 4', expr => {
            expect(expr.first())
                .isVarDecl()
                .andIdent(isIdentifier('x'))
                .andInitializer(init => init.isBinaryExpr())
        })
    })

    it('accepts typed variable', function(){
        parse('var x: Int = true', expr => {
            expect(expr.first())
                .isVarDecl()
                .andIdent(isIdentifier('x'))
                .andInitializer(init => {
                    init.isTypeExpr()
                        .andType(isTypeId('Int'))
                        .andExpr(isLiteral(true))
                })
        })

        parse('var y: Int*** = &x', expr => {
            expect(expr.first())
                .isVarDecl()
                .andIdent(isIdentifier('y'))
                .andInitializer(init => {
                    init.isTypeExpr()
                        .andType(type => {
                            type.isTypeId()
                                .andIdent(isIdentifier('Int'))
                                .hasReferenceDepth(3)
                        })
                        .andExpr(expr => {
                            expr.isUnaryExpr()
                                .hasOperator('&')
                                .andRight(isIdentifier('x'))
                        })
                })
        })

        parse('var z: Int = *x', expr => {
            expect(expr.first())
                .isVarDecl()
                .andIdent(isIdentifier('z'))
                .andInitializer(init => {
                    init.isTypeExpr()
                        .andType(isTypeId('Int'))
                        .andExpr(expr => {
                            expr.isUnaryExpr()
                                .hasOperator('*')
                                .andRight(isIdentifier('x'))
                        })
                })
        })
    })

    it('rejects invalid address operations', function(){
        assert.throws(() => parse('&4'))
        assert.throws(() => parse('&&x'))
    })

    it('treats declaration as expression', function(){
        parse('(var x = 123) + 7', expr => {
            expect(expr.first())
                .isBinaryExpr()
                .hasOperator('+')
                .andLeft(left => left.isGrouping())
                .andRight(isLiteral())
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
                .andExprAt(1, isLiteral(null))
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

    it('accepts control flow statements', function(){
        parse('while x < 10 do { if x % 2 == 0 then continue; print_int(x) }', expr => {
            expect(expr.first())
                .isWhileExpr()
                .andCond(cond => cond.isLogicalExpr())
                .andBody(body => {
                    body.isBlock()
                        .andExprAt(0, expr => {
                            expr.isIfExpr().andBody(body => body.isContinue())
                        })
                })
        })

        parse('while true do { if i > 500 then break else print_int(i) }', expr => {
            expect(expr.first())
                .isWhileExpr()
                .andCond(cond => cond.isLiteral())
                .andBody(body => {
                    body.isBlock()
                        .andExprAt(0, expr => {
                            expr.isIfExpr().andBody(body => body.isBreak())
                        })
                })
        })
    })

    it('rejects top-level break/continue', function(){
        assert.throws(() => parse('break'))
        assert.throws(() => parse('continue'))
    })

    it('accepts simple function declaration', function(){
        parse('fun square(x: Int): Int = x * x', expr => {
            expect(expr.first())
                .isFunDecl()
                .andIdent(isIdentifier('square'))
                .andRetType(isTypeId('Int'))
                .andArgAt(0, expr => {
                    expr.isTypeExpr()
                        .andType(isTypeId('Int'))
                        .andExpr(isIdentifier('x'))
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
                .andIdent(isIdentifier('logical_or'))
                .andRetType(isTypeId('Bool'))
                .andArgAt(0, expr => {
                    expr.isTypeExpr()
                        .andType(isTypeId('Bool'))
                        .andExpr(isIdentifier('a'))
                })
                .andArgAt(1, expr => {
                    expr.isTypeExpr()
                        .andType(isTypeId('Bool'))
                        .andExpr(isIdentifier('b'))
                })
        })
    })

    it('accepts return expressions', function(){
        parse('fun fib(n: Int): Int { if n <= 1 then return n; return fib(n - 2) + fib(n - 1) }', expr => {
            expect(expr.first())
                .isFunDecl()
                .andIdent(isIdentifier('fib'))
                .andRetType(isTypeId('Int'))
                .andArgAt(0, expr => expr.isTypeExpr())
                .andBody(body => {
                    body.isBlock()
                        .andExprAt(0, expr => {
                            expr.isIfExpr()
                                .andBody(body => body.isReturn().andValue(isIdentifier()))
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
                                .andBody(isLiteral(true))
                                .andElse(isLiteral(false))
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
                                .andBody(body => body.isBlock().andExprAt(0, isLiteral()))
                                .andElse(elsz => elsz.isBlock().andExprAt(0, isLiteral()))
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
                                        .andBody(isLiteral(true))
                                        .andElse(isLiteral(false))
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