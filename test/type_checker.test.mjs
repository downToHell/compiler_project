import assert from 'node:assert'
import { Parser } from '../src/parser.mjs'
import { Tokenizer } from '../src/tokenizer.mjs'
import { TypeChecker } from '../src/type_checker.mjs'
import { Bool, FunType, PtrType, Int, Unit } from '../src/types.mjs'

export const IntPtr = new PtrType(Int, 1)

const typecheck = (src, callback) => {
    const scn = new Tokenizer(src)
    const parser = new Parser(scn.tokens())
    const typechecker = new TypeChecker()

    if (!callback){
        callback = (module) => module.first()
    }
    return typechecker.typecheck(callback(parser.parse()))
}
const typecheckModule = (src) => typecheck(src, (m) => m)

describe('Typechecker tests', function(){
    it('typechecks simple addition', function(){
        assert.ok(typecheck('1 + 2').is(Int))
    })

    it('rejects invalid arithmetics', function(){
        assert.throws(() => typecheck('1 + true'))
    })

    it('typechecks unary expressions', function(){
        assert.ok(typecheck('not true').is(Bool))
        assert.ok(typecheck('-3').is(Int))
        assert.ok(typecheck('1+-5').is(Int))
    })

    it('rejects invalid unary expressions', function(){
        assert.throws(() => typecheck('not 5'))
        assert.throws(() => typecheck('-true'))
    })

    it('typechecks logical expressions', function(){
        assert.ok(typecheck('3 != 3 or 3 < 5').is(Bool))
    })

    it('rejects invalid logical operands', function(){
        assert.throws(() => typecheck('5 + 3 and true'))
    })

    it('typechecks simple if-expression', function(){
        assert.ok(typecheck('if true then 3').is(Unit))
    })

    it('typechecks if-else expression', function(){
        assert.ok(typecheck('if 1 < 3 then 1 else 3').is(Int))
    })

    it('rejects if-then arithmetics', function(){
        assert.throws(() => typecheck('1 * if true then 3'))
    })

    it('rejects unmatched if-else types', function(){
        assert.throws(() => typecheck('if 1 == 1 then true else 3'))
    })

    it('typechecks variable declaration', function(){
        assert.ok(typecheck('{ var x = 3; x }').is(Int))
    })

    it('typechecks variable assignment', function(){
        assert.ok(typecheck('{ var x = 3; x = 5 }').is(Int))
    })

    it('rejects reassignment with differing type', function(){
        assert.throws(() => typecheck('{ var x = 3; x = true }'))
    })

    it('rejects unscoped variable', function(){
        assert.throws(() => typecheck('{ var x = 3; { var y = 0 } y }'))
    })

    it('typechecks typed variable', function(){
        assert.ok(typecheck('var x: Int = 5 + 6').is(Int))
        assert.ok(typecheck('var y: Bool = true').is(Bool))
        assert.ok(typecheck('var z: Unit = while 2 > 5 do print_int(1)').is(Unit))
        assert.ok(typecheck('{ var a: Int = 3; var b: Int* = &a; *b }').is(Int))
        assert.ok(typecheck('{ var c: Int = 5; var d: Int* = &c; d }').is(IntPtr))
        assert.ok(typecheck('{ var e: Int = 7; var f: Int* = &e; var g: Int** = &f; *g }').is(IntPtr))
    })

    it('rejects invalid type expression', function(){
        assert.throws(() => typecheck('var x: Int = true'))
        assert.throws(() => typecheck('var y: Bool = 1'))
        assert.throws(() => typecheck('var z: Unit = if 3 then 2 else 1'))
        assert.throws(() => typecheck('var a: Int* = 9'))
        assert.throws(() => typecheck('{ var b: Int = 3; var c: Int** = &b }'))
    })

    it('rejects invalid pointer operations', function(){
        assert.throws(() => typecheck('*3'))
        assert.throws(() => typecheck('*3 = 5'))
    })

    it('typechecks built-in function calls', function(){
        assert.ok(typecheck('print_int(3)').is(Unit))
        assert.ok(typecheck('{ var x = 3; print_int(x) }').is(Unit))
    })

    it('rejects invalid function calls', function(){
        assert.throws(() => typecheck('print_int()'))
        assert.throws(() => typecheck('print_int(true)'))
        assert.throws(() => typecheck('print_bool(3)'))
        assert.throws(() => typecheck('print_int(while 3 < 5 do 3)'))
    })

    it('typechecks simple function declarations', function(){
        let res = typecheckModule('fun square(x: Int): Int = x * x')[0]
        assert.ok(res instanceof FunType)
        assert.strictEqual(res.args.length, 1)
        assert.ok(res.args[0].is(Int))
        assert.ok(res.ret.is(Int))

        res = typecheckModule('fun print_int_twice(x: Int): Unit { print_int(x); print_int(x); }')[0]
        assert.ok(res instanceof FunType)
        assert.strictEqual(res.args.length, 1)
        assert.ok(res.args[0].is(Int))
        assert.ok(res.ret.is(Unit))

        res = typecheckModule('fun square_inplace(p: Int*): Unit { *p = *p * *p; }')[0]
        assert.ok(res instanceof FunType)
        assert.strictEqual(res.args.length, 1)
        assert.ok(res.args[0].is(IntPtr))
        assert.ok(res.ret.is(Unit))
    })

    it('typechecks return expressions', function(){
        assert.doesNotThrow(() => typecheckModule('fun noop(): Unit {}'))
        assert.doesNotThrow(() => typecheckModule('fun sum(a: Int, b: Int): Int { a + b }'))
        assert.doesNotThrow(() => typecheckModule('fun test(y: Int): Int { while y > 0 do y = y - 1; y }'))
        assert.doesNotThrow(() => typecheckModule('fun fib(n: Int): Int { if n <= 1 then return n; return fib(n - 2) + fib(n - 1) }'))
        assert.doesNotThrow(() => typecheckModule('fun even(i: Int): Bool = if i % 2 == 0 then true else false'))
        assert.doesNotThrow(() => typecheckModule('fun odd(j: Int): Bool = if j % 2 == 0 then { false } else { true }'))
        assert.doesNotThrow(() => typecheckModule('fun even(i: Int): Bool { return if i % 2 == 0 then true else false }'))
        assert.doesNotThrow(() => typecheckModule('fun odd(j: Int): Bool { if j % 2 == 0 then { return false } else { return true } }'))
    })

    it('rejects invalid return expressions', function(){
        assert.throws(() => typecheckModule('fun invalid_ret(): Unit { return 1 }'))
        assert.throws(() => typecheckModule('fun nested(): Int { return return 1 }'))
        assert.throws(() => typecheckModule('fun mul(a: Int, b: Int): Bool { a * b }'))
        assert.throws(() => typecheckModule('fun sub(a: Int, b: Int): Int = false'))
        assert.throws(() => typecheckModule('fun square(x: Int): Int = return x * x'))
        assert.throws(() => typecheckModule('fun test(y: Int): Int = while y > 0 do y = y - 1'))
        assert.throws(() => typecheckModule('fun invalid_ret2(k: Bool): Int { if k == true then { return 1 }; return false; }'))
    })
})