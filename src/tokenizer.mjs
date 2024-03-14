import { L, SourceContext } from './source_context.mjs'

const TokenType = Object.freeze({
    EQ: '=',
    EQ_EQ: '==',
    NE: '!=',
    BANG: '!',
    OR: 'or',
    AND: 'and',
    NOT: 'not',
    LT: '<',
    LE: '<=',
    GT: '>',
    GE: '>=',
    PLUS: '+',
    MINUS: '-',
    UNARY_MINUS: 'unary_-',
    STAR: '*',
    POW: '**',
    DIV: '/',
    MOD: '%',
    LPAREN: '(',
    RPAREN: ')',
    LBRACE: '{',
    RBRACE: '}',
    COLON: ':',
    COMMA: ',',
    SEMICOLON: ';',
    HASHTAG: '#',
    IF: '<if>',
    THEN: '<then>',
    ELSE: '<else>',
    WHILE: '<while>',
    DO: '<do>',
    BREAK: '<break>',
    CONTINUE: '<continue>',
    INT_LITERAL: '<int>',
    BOOL_LITERAL: '<bool>',
    UNIT_LITERAL: '<unit>',
    IDENTIFIER: '<ident>',
    FUN: '<fun>',
    RETURN: '<return>',
    VAR: '<var>',
    END: '<end>'
})
const keywords = Object.freeze({
    if: TokenType.IF,
    then: TokenType.THEN,
    else: TokenType.ELSE,
    while: TokenType.WHILE,
    do: TokenType.DO,
    break: TokenType.BREAK,
    continue: TokenType.CONTINUE,
    fun: TokenType.FUN,
    return: TokenType.RETURN,
    var: TokenType.VAR,
    unit: TokenType.UNIT_LITERAL,
    true: TokenType.BOOL_LITERAL,
    false: TokenType.BOOL_LITERAL,
    or: TokenType.OR,
    and: TokenType.AND,
    not: TokenType.NOT
})

function isNumber(str){
    return !isNaN(parseInt(str)) && isFinite(str)
}
function isLetter(str){
    return str.toLowerCase() != str.toUpperCase()
}
function isAlphabetic(str){
    return isLetter(str) || isNumber(str)
}

function Token(value, type, loc){
    this.value = value
    this.type = type
    this.loc = loc
}

function Tokenizer(inp, options){
    const ctx = new SourceContext(inp)

    options = options || {}
    const { ignoreLoc } = options
    const { isEOF, peek, consume, advance } = ctx

    const makeToken = (...options) => {
        let [type, ch, loc] = options
        loc = ignoreLoc ? L : loc || ctx.loc()

        return ch !== undefined ? new Token(ch, type, loc) : new Token(type, type, loc)
    }
    const makeNumber = (ch) => {
        let buf = ch

        while (!isEOF() && isNumber(peek())){
            buf += advance()
        }
        return makeToken(TokenType.INT_LITERAL, parseInt(buf))
    }
    const makeId = (ch) => {
        let buf = ch

        while (!isEOF() && (isAlphabetic((ch = peek())) || ch === '_')){
            buf += advance()
        }
        return buf
    }
    const skipSingleLineComment = () => {
        let ch

        while (!isEOF() && (ch = peek()) != '\r' && ch != '\n'){
            advance()
        }
        return this.nextToken()
    }
    const skipMultiLineComment = () => {
        let ch, prev

        while (!isEOF() && !((ch = peek()) === '/' && prev === '*')){
            prev = ch
            advance()
        }
        advance()
        return this.nextToken()
    }
    const handleDivToken = (ch) => {
        if (consume(TokenType.DIV)){
            return skipSingleLineComment()
        } else if (consume(TokenType.STAR)){
            return skipMultiLineComment()
        }
        return makeToken(ch)
    }
    const isKeyword = (str) => keywords[str] !== undefined

    this.tokens = function(){
        let result = []
        let token

        while ((token = this.nextToken()) != null){
            result.push(token)
        }
        return result
    }
    this.nextToken = function(){
        if (isEOF()) return null
        let ch = advance()

        switch (ch){
            case TokenType.PLUS:
            case TokenType.MINUS:
            case TokenType.MOD:
            case TokenType.LPAREN:
            case TokenType.RPAREN:
            case TokenType.LBRACE:
            case TokenType.RBRACE:
            case TokenType.COMMA:
            case TokenType.COLON:
            case TokenType.SEMICOLON:
                return makeToken(ch)
            case TokenType.DIV: return handleDivToken(ch)
            case TokenType.HASHTAG: return skipSingleLineComment()
            case TokenType.STAR: return consume(TokenType.STAR) ? makeToken(TokenType.POW) : makeToken(ch)
            case TokenType.LT: return consume(TokenType.EQ) ? makeToken(TokenType.LE) : makeToken(ch)
            case TokenType.GT: return consume(TokenType.EQ) ? makeToken(TokenType.GE) : makeToken(ch)
            case TokenType.EQ: return consume(TokenType.EQ) ? makeToken(TokenType.EQ_EQ) : makeToken(ch)
            case TokenType.BANG: return consume(TokenType.EQ) ? makeToken(TokenType.NE) : makeToken(ch)
            case ' ':
            case '\t':
            case '\r':
            case '\n':
                return this.nextToken()
            default: {
                if (isNumber(ch)){
                    return makeNumber(ch)
                } else if (ch === '_' || isLetter(ch)){
                    let id = makeId(ch)
                    return isKeyword(id) ? makeToken(keywords[id], id) : makeToken(TokenType.IDENTIFIER, id)
                }
                throw new Error(`Tokenization failed at ${ctx.loc()}: unknown character '${ch}'`)
            }
        }
    }
}

export { TokenType, Token, Tokenizer, isNumber, isLetter }