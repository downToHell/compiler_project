import assert from 'node:assert'
import { L } from '../src/source_context.mjs'
import { Token, TokenType, Tokenizer } from '../src/tokenizer.mjs'

const tokenize = (inp) => {
    const scn = new Tokenizer(inp, { ignoreLoc: true })
    return scn.tokens()
}
const makeToken = (value, type) => new Token(value, type, L)

describe('Tokenizer tests', function(){

    it('empty input', function(){
        assert.ok(tokenize('').length === 0)
    })

    it('recognizes numbers > 9', function(){
        assert.deepStrictEqual(tokenize('155'), [
            makeToken(155, TokenType.INT_LITERAL)
        ])
    })
    
    it('recognizes arithmetic operations', function(){
        const expected = [
            makeToken(3, TokenType.INT_LITERAL),
            makeToken('+', TokenType.PLUS),
            makeToken(5, TokenType.INT_LITERAL),
            makeToken('*', TokenType.STAR),
            makeToken(8, TokenType.INT_LITERAL),
            makeToken('%', TokenType.MOD),
            makeToken(2, TokenType.INT_LITERAL),
            makeToken('/', TokenType.DIV),
            makeToken(7, TokenType.INT_LITERAL),
            makeToken('**', TokenType.POW),
            makeToken(4, TokenType.INT_LITERAL)
        ]
        assert.deepStrictEqual(tokenize('3 + 5 * 8 % 2 / 7 ** 4'), expected)
    })

    it('recognizes identifiers', function(){
        const expected = [
            makeToken('a', TokenType.IDENTIFIER),
            makeToken('+', TokenType.PLUS),
            makeToken('_bK1', TokenType.IDENTIFIER)
        ]
        assert.deepStrictEqual(tokenize('a + _bK1'), expected)
    })

    it('rejects invalid identifiers', function(){
        assert.notEqual(tokenize('0a_')[0], makeToken('0a_', TokenType.IDENTIFIER))
    })

    it('recognizes parentheses', function(){
        const expected = [
            makeToken('(', TokenType.LPAREN),
            makeToken('a', TokenType.IDENTIFIER),
            makeToken('+', TokenType.PLUS),
            makeToken('b', TokenType.IDENTIFIER),
            makeToken(')', TokenType.RPAREN),
            makeToken('*', TokenType.STAR),
            makeToken(2, TokenType.INT_LITERAL)
        ]
        assert.deepStrictEqual(tokenize('(a + b) * 2'), expected)
    })

    it('recognizes keywords', function(){
        const expected = [
            makeToken('if', TokenType.IF),
            makeToken('then', TokenType.THEN),
            makeToken('else', TokenType.ELSE),
            makeToken('while', TokenType.WHILE),
            makeToken('do', TokenType.DO),
            makeToken('break', TokenType.BREAK),
            makeToken('continue', TokenType.CONTINUE),
            makeToken('true', TokenType.BOOL_LITERAL),
            makeToken('false', TokenType.BOOL_LITERAL),
            makeToken('or', TokenType.OR),
            makeToken('and', TokenType.AND),
            makeToken('fun', TokenType.FUN),
            makeToken('return', TokenType.RETURN),
            makeToken('var', TokenType.VAR)
        ]
        assert.deepStrictEqual(tokenize('if then else while do break continue true false or and fun return var'), expected)
    })

    it('recognizes type expressions', function(){
        const expected = [
            makeToken('var', TokenType.VAR),
            makeToken('x', TokenType.IDENTIFIER),
            makeToken(':', TokenType.COLON),
            makeToken('Int', TokenType.IDENTIFIER),
            makeToken('=', TokenType.EQ),
            makeToken(3, TokenType.INT_LITERAL)
        ]
        assert.deepStrictEqual(tokenize('var x: Int = 3'), expected)
    })

    it('recognizes address operations', function(){
        const expected = [
            makeToken('&', TokenType.AMP),
            makeToken('x', TokenType.IDENTIFIER),
            makeToken('*', TokenType.STAR),
            makeToken('ptr', TokenType.IDENTIFIER),
            makeToken('Int', TokenType.IDENTIFIER),
            makeToken('*', TokenType.STAR)
        ]
        assert.deepStrictEqual(tokenize('&x *ptr Int*'), expected)
    })

    it('recognizes comparisons', function(){
        const expected = [
            makeToken('<', TokenType.LT),
            makeToken('<=', TokenType.LE),
            makeToken('>', TokenType.GT),
            makeToken('>=', TokenType.GE),
            makeToken('=', TokenType.EQ),
            makeToken('==', TokenType.EQ_EQ)
        ]
        assert.deepStrictEqual(tokenize('< <= > >= = =='), expected)
    })

    it('recognizes braces/new lines', function(){
        const expected = [
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
        ]
        assert.deepStrictEqual(tokenize('if a <= b then {\n print_int(a) }'), expected)
    })

    it('skips single-line comments', function(){
        const expected = [
            makeToken('a', TokenType.IDENTIFIER),
            makeToken('==', TokenType.EQ_EQ),
            makeToken('b', TokenType.IDENTIFIER),
            makeToken('a', TokenType.IDENTIFIER),
            makeToken('+', TokenType.PLUS),
            makeToken('b', TokenType.IDENTIFIER)
        ]
        assert.deepStrictEqual(tokenize('# this is a comment\n a == b // comments also work with slashes\n a + b'), expected)
    })

    it('skips multi-line comments', function(){
        const expected = [
            makeToken('a', TokenType.IDENTIFIER),
            makeToken('+', TokenType.PLUS),
            makeToken('b', TokenType.IDENTIFIER)
        ]
        assert.deepStrictEqual(tokenize('/* This is a comment\n that is supposed\n to span\n multiple lines */ a + b'), expected)
    })

    it('skips whitespace', function(){
        const expected = [
            makeToken(4, TokenType.INT_LITERAL),
            makeToken('+', TokenType.PLUS),
            makeToken(5, TokenType.INT_LITERAL),
            makeToken('_myVar', TokenType.IDENTIFIER)
        ]
        assert.deepStrictEqual(tokenize('  4 + 5  _myVar  '), expected)
    })

    it('accepts non-spaced code', function(){
        const expected = [
            makeToken(3, TokenType.INT_LITERAL),
            makeToken('-', TokenType.MINUS),
            makeToken(6, TokenType.INT_LITERAL)
        ]
        assert.deepStrictEqual(tokenize('3-6'), expected)
    })
})