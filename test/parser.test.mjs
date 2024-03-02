import assert from 'node:assert'
import { Parser } from "../src/parser.mjs"
import { Tokenizer } from "../src/tokenizer.mjs"
import {
    Assignment,
    BinaryExpr,
    Block,
    Call,
    FunDecl,
    Grouping,
    Identifier,
    IfExpr,
    Literal,
    LogicalExpr,
    TypeExpr,
    UnaryExpr,
    VarDecl,
    WhileExpr
} from '../src/ast.mjs'

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
        let expr = parser.parse().first()

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
        let expr = parser.parse().first()

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

    it('accepts power expressions', function(){
        let parser = makeParser('1 + 2 * 3 ** 5')
        let expr = parser.parse().first()

        assert.ok(expr instanceof BinaryExpr)
        assert.ok(expr.left instanceof Literal)
        assert.ok(expr.right instanceof BinaryExpr)
        assert.ok(expr.right.left instanceof Literal)
        assert.ok(expr.right.right instanceof BinaryExpr)
        assert.ok(expr.right.right.left instanceof Literal)
        assert.ok(expr.right.right.right instanceof Literal)
        assert.strictEqual(expr.op, '+')
        assert.strictEqual(expr.right.op, '*')
        assert.strictEqual(expr.right.right.op, '**')
        assert.strictEqual(expr.left.value, 1)   
        assert.strictEqual(expr.right.left.value, 2)
        assert.strictEqual(expr.right.right.left.value, 3)
        assert.strictEqual(expr.right.right.right.value, 5)
    })

    it('accepts grouped expressions', function(){
        let parser = makeParser('(1 - 2) / 3')
        let expr = parser.parse().first()

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
        let expr = parser.parse().first()

        assert.ok(expr instanceof UnaryExpr)
        assert.ok(expr.right instanceof Literal)
        assert.strictEqual(expr.op, '-')
        assert.strictEqual(expr.right.value, 5)
    })

    it('accepts double negation', function(){
        let parser = makeParser('not not 8')
        let expr = parser.parse().first()

        assert.ok(expr instanceof UnaryExpr)
        assert.ok(expr.right instanceof UnaryExpr)
        assert.ok(expr.right.right instanceof Literal)
        assert.strictEqual(expr.op, 'not')
        assert.strictEqual(expr.right.op, 'not')
        assert.strictEqual(expr.right.right.value, 8)
    })

    it('accepts identifiers in arithmetic op', function(){
        let parser = makeParser('a + b * c')
        let expr = parser.parse().first()

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
        let expr = parser.parse().first()

        assert.ok(expr instanceof LogicalExpr)
        assert.ok(expr.left instanceof Identifier)
        assert.ok(expr.right instanceof LogicalExpr)
        assert.strictEqual(expr.op, 'or')
        assert.strictEqual(expr.right.op, 'and')
        assert.strictEqual(expr.left.name, 'a')
        assert.strictEqual(expr.right.left.name, 'b')
        assert.strictEqual(expr.right.right.name, 'c')
    })

    it('accepts comparison', function(){
        let parser = makeParser('a < b and b != c')
        let expr = parser.parse().first()

        assert.ok(expr instanceof LogicalExpr)
        assert.ok(expr.left instanceof LogicalExpr)
        assert.ok(expr.right instanceof LogicalExpr)
        assert.ok(expr.left.left instanceof Identifier)
        assert.ok(expr.left.right instanceof Identifier)
        assert.ok(expr.right.left instanceof Identifier)
        assert.ok(expr.right.right instanceof Identifier)
        assert.strictEqual(expr.op, 'and')
        assert.strictEqual(expr.left.op, '<')
        assert.strictEqual(expr.right.op, '!=')
        assert.strictEqual(expr.left.left.name, 'a')
        assert.strictEqual(expr.left.right.name, 'b')
        assert.strictEqual(expr.right.left.name, 'b')
        assert.strictEqual(expr.right.right.name, 'c')
    })

    it('accepts assignment expression', function(){
        let parser = makeParser('x = 3 + 5')
        let expr = parser.parse().first()

        assert.ok(expr instanceof Assignment)
        assert.ok(expr.target instanceof Identifier)
        assert.ok(expr.expr instanceof BinaryExpr)
        assert.ok(expr.expr.left instanceof Literal)
        assert.ok(expr.expr.right instanceof Literal)
        assert.strictEqual(expr.target.name, 'x')
        assert.strictEqual(expr.expr.op, '+')
        assert.strictEqual(expr.expr.left.value, 3)
        assert.strictEqual(expr.expr.right.value, 5)
    })

    it('rejects invalid assignment', function(){
        let parser = makeParser('3 = 5')
        assert.throws(() => parser.parse())
    })

    it('accepts if expressions', function(){
        let parser = makeParser('if true then b + c else x * y')
        let expr = parser.parse().first()

        assert.ok(expr instanceof IfExpr)
        assert.ok(expr.cond instanceof Literal)
        assert.ok(expr.body instanceof BinaryExpr)
        assert.ok(expr.elsz instanceof BinaryExpr)
        assert.strictEqual(expr.cond.value, true)
        assert.strictEqual(expr.body.op, '+')
        assert.strictEqual(expr.body.left.name, 'b')
        assert.strictEqual(expr.body.right.name, 'c')
        assert.strictEqual(expr.elsz.op, '*')
        assert.strictEqual(expr.elsz.left.name, 'x')
        assert.strictEqual(expr.elsz.right.name, 'y')
    })

    it('treats else as optional', function(){
        let parser = makeParser('if a then a + 5')
        let expr = parser.parse().first()

        assert.ok(expr instanceof IfExpr)
        assert.ok(expr.cond instanceof Identifier)
        assert.strictEqual(expr.elsz, undefined)
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
        let expr = parser.parse().first()
        
        assert.ok(expr instanceof Call)
        assert.strictEqual(expr.target.name, 'f')
        assert.strictEqual(expr.args.length, 2)
    })

    it('accepts variable declaration', function(){
        let parser = makeParser('var x = 123 + 4')
        let expr = parser.parse().first()

        assert.ok(expr instanceof VarDecl)
        assert.ok(expr.ident instanceof Identifier)
        assert.ok(expr.initializer instanceof BinaryExpr)
    })

    it('accepts typed variable', function(){
        let parser = makeParser('var x: Int = true')
        let expr = parser.parse().first()

        assert.ok(expr instanceof VarDecl)
        assert.ok(expr.ident instanceof Identifier)
        assert.ok(expr.initializer instanceof TypeExpr)
        assert.ok(expr.initializer.type instanceof Identifier)
        assert.ok(expr.initializer.expr instanceof Literal)
    })

    it('treats declaration as expression', function(){
        let parser = makeParser('(var x = 123) + 7')
        let expr = parser.parse().first()

        assert.ok(expr instanceof BinaryExpr)
        assert.ok(expr.left instanceof Grouping)
        assert.ok(expr.left.expr instanceof VarDecl)
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
        let expr = parser.parse().first()

        assert.ok(expr instanceof Block)
        assert.strictEqual(expr.exprs.length, 3)
    })

    it('accepts optional semicolon after block', function(){
        let parser = makeParser('{ a = b + c; }')
        let expr = parser.parse().first()
        
        assert.ok(expr instanceof Block)
        assert.ok(expr.exprs[1] instanceof Literal)
        assert.strictEqual(expr.exprs.length, 2)
        assert.strictEqual(expr.exprs[1].value, null)
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
        let expr = parser.parse().first()

        assert.ok(expr instanceof WhileExpr)
        assert.ok(expr.cond instanceof Literal)
        assert.ok(expr.body instanceof Block)
        assert.strictEqual(expr.body.exprs.length, 2)
    })

    it('accepts simple function declaration', function(){
        let parser = makeParser('fun square(x: Int): Int = x * x')
        let expr = parser.parse().first()

        assert.ok(expr instanceof FunDecl)
        assert.ok(expr.ident instanceof Identifier)
        assert.ok(expr.retType instanceof Identifier)
        assert.strictEqual(expr.args.length, 1)
        assert.ok(expr.args[0] instanceof TypeExpr)
        assert.ok(expr.args[0].expr instanceof Identifier)
        assert.strictEqual(expr.args[0].expr.name, 'x')
        assert.strictEqual(expr.args[0].type.name, 'Int')
        assert.strictEqual(expr.ident.name, 'square')
        assert.strictEqual(expr.retType.name, 'Int')
    })

    it('accepts no-arg function', function(){
        let parser = makeParser('fun print_twice(): Unit { print_int(1); print_int(2); }')
        assert.doesNotThrow(() => parser.parse())
    })

    it('accepts multi-arg function', function(){
        let parser = makeParser('fun logicalOr(a: Bool, b: Bool): Bool = a or b')
        let expr = parser.parse().first()

        assert.ok(expr instanceof FunDecl)
        assert.ok(expr.ident instanceof Identifier)
        assert.ok(expr.retType instanceof Identifier)
        assert.strictEqual(expr.args.length, 2)
        assert.ok(expr.args[0] instanceof TypeExpr)
        assert.ok(expr.args[1] instanceof TypeExpr)
        assert.ok(expr.args[0].expr instanceof Identifier)
        assert.ok(expr.args[1].expr instanceof Identifier)
        assert.ok(expr.args[0].type instanceof Identifier)
        assert.ok(expr.args[1].type instanceof Identifier)
        assert.strictEqual(expr.args[0].expr.name, 'a')
        assert.strictEqual(expr.args[1].expr.name, 'b')
        assert.strictEqual(expr.args[0].type.name, 'Bool')
        assert.strictEqual(expr.args[1].type.name, 'Bool')
        assert.strictEqual(expr.retType.name, 'Bool')
    })

    it('rejects functions without return type', function(){
        let parser = makeParser('fun noRet() = print_int(1)')
        assert.throws(() => parser.parse())
    })

    it('rejects untyped arguments', function(){
        let parser = makeParser('fun sum(a, b): Int = a + b')
        assert.throws(() => parser.parse())
    })

    it('rejects trailing comma in function declaration', function(){
        let parser = makeParser('fun invalidArgs(a: Int, b: Int,): Int = a and b')
        assert.throws(() => parser.parse())
    })
})