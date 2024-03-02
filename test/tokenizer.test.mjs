import assert from 'node:assert'
import { L } from '../src/source_context.mjs'
import { Token, TokenType, Tokenizer } from '../src/tokenizer.mjs'

const opt = { ignoreLoc: true }
const makeToken = (value, type) => new Token(value, type, L)

describe('Tokenizer tests', function(){

    it('empty input', function(){
        const scn = new Tokenizer('', opt)
        assert.ok(scn.tokens().length === 0)
    })

    it('recognizes numbers > 9', function(){
        const scn = new Tokenizer('155', opt)

        assert.deepStrictEqual(scn.tokens(), [
            makeToken(155, TokenType.INT_LITERAL)
        ])
    })
    
    it('recognizes arithmetic operations', function(){
        const scn = new Tokenizer('3 + 5 * 8 % 2 / 7 ** 4', opt)

        assert.deepStrictEqual(scn.tokens(), [
            makeToken(3, TokenType.INT_LITERAL),
            makeToken('+', TokenType.PLUS),
            makeToken(5, TokenType.INT_LITERAL),
            makeToken('*', TokenType.MUL),
            makeToken(8, TokenType.INT_LITERAL),
            makeToken('%', TokenType.MOD),
            makeToken(2, TokenType.INT_LITERAL),
            makeToken('/', TokenType.DIV),
            makeToken(7, TokenType.INT_LITERAL),
            makeToken('**', TokenType.POW),
            makeToken(4, TokenType.INT_LITERAL)
        ])
    })

    it('recognizes identifiers', function(){
        const scn = new Tokenizer('a + _bK1', opt)

        assert.deepStrictEqual(scn.tokens(), [
            makeToken('a', TokenType.IDENTIFIER),
            makeToken('+', TokenType.PLUS),
            makeToken('_bK1', TokenType.IDENTIFIER)
        ])
    })

    it('rejects invalid identifiers', function(){
        const scn = new Tokenizer('0a_', opt)
        assert.notEqual(scn.nextToken(), makeToken('0a_', TokenType.IDENTIFIER))
    })

    it('recognizes parentheses', function(){
        const scn = new Tokenizer('(a + b) * 2', opt)

        assert.deepStrictEqual(scn.tokens(), [
            makeToken('(', TokenType.LPAREN),
            makeToken('a', TokenType.IDENTIFIER),
            makeToken('+', TokenType.PLUS),
            makeToken('b', TokenType.IDENTIFIER),
            makeToken(')', TokenType.RPAREN),
            makeToken('*', TokenType.MUL),
            makeToken(2, TokenType.INT_LITERAL)
        ])
    })

    it('recognizes keywords', function(){
        const scn = new Tokenizer('if then else while do true false or and fun var', opt)

        assert.deepStrictEqual(scn.tokens(), [
            makeToken('if', TokenType.IF),
            makeToken('then', TokenType.THEN),
            makeToken('else', TokenType.ELSE),
            makeToken('while', TokenType.WHILE),
            makeToken('do', TokenType.DO),
            makeToken('true', TokenType.BOOL_LITERAL),
            makeToken('false', TokenType.BOOL_LITERAL),
            makeToken('or', TokenType.OR),
            makeToken('and', TokenType.AND),
            makeToken('fun', TokenType.FUN),
            makeToken('var', TokenType.VAR)
        ])
    })

    it('recognizes type expressions', function(){
        const scn = new Tokenizer('var x: Int = 3', opt)

        assert.deepStrictEqual(scn.tokens(), [
            makeToken('var', TokenType.VAR),
            makeToken('x', TokenType.IDENTIFIER),
            makeToken(':', TokenType.COLON),
            makeToken('Int', TokenType.IDENTIFIER),
            makeToken('=', TokenType.EQ),
            makeToken(3, TokenType.INT_LITERAL)
        ])
    })

    it('recognizes comparisons', function(){
        const scn = new Tokenizer('< <= > >= = ==', opt)

        assert.deepStrictEqual(scn.tokens(), [
            makeToken('<', TokenType.LT),
            makeToken('<=', TokenType.LE),
            makeToken('>', TokenType.GT),
            makeToken('>=', TokenType.GE),
            makeToken('=', TokenType.EQ),
            makeToken('==', TokenType.EQ_EQ)
        ])
    })

    it('recognizes braces/new lines', function(){
        const scn = new Tokenizer('if a <= b then {\n print_int(a) }', opt)

        assert.deepStrictEqual(scn.tokens(), [
            makeToken('if', TokenType.IF),
            makeToken('a', TokenType.IDENTIFIER),
            makeToken('<=', TokenType.LE),
            makeToken('b', TokenType.IDENTIFIER),
            makeToken('then', TokenType.THEN),
            makeToken('{', TokenType.LBRACE),
            makeToken('print_int', TokenType.IDENTIFIER),
            makeToken('(', TokenType.LPAREN),
            makeToken('a', TokenType.IDENTIFIER),
            makeToken(')', TokenType.RPAREN),
            makeToken('}', TokenType.RBRACE)
        ])
    })

    it('skips single-line comments', function(){
        const scn = new Tokenizer('# this is a comment\n a == b // comments also work with slashes\n a + b', opt)

        assert.deepStrictEqual(scn.tokens(), [
            makeToken('a', TokenType.IDENTIFIER),
            makeToken('==', TokenType.EQ_EQ),
            makeToken('b', TokenType.IDENTIFIER),
            makeToken('a', TokenType.IDENTIFIER),
            makeToken('+', TokenType.PLUS),
            makeToken('b', TokenType.IDENTIFIER)
        ])
    })

    it('skips multi-line comments', function(){
        const scn = new Tokenizer('/* This is a comment\n that is supposed\n to span\n multiple lines */ a + b', opt)

        assert.deepStrictEqual(scn.tokens(), [
            makeToken('a', TokenType.IDENTIFIER),
            makeToken('+', TokenType.PLUS),
            makeToken('b', TokenType.IDENTIFIER)
        ])
    })

    it('skips whitespace', function(){
        const scn = new Tokenizer('  4 + 5  _myVar  ', opt)

        assert.deepStrictEqual(scn.tokens(), [
            makeToken(4, TokenType.INT_LITERAL),
            makeToken('+', TokenType.PLUS),
            makeToken(5, TokenType.INT_LITERAL),
            makeToken('_myVar', TokenType.IDENTIFIER)
        ])
    })

    it('accepts non-spaced code', function(){
        const scn = new Tokenizer('3-6', opt)
        
        assert.deepStrictEqual(scn.tokens(), [
            makeToken(3, TokenType.INT_LITERAL),
            makeToken('-', TokenType.MINUS),
            makeToken(6, TokenType.INT_LITERAL)
        ])
    })
})