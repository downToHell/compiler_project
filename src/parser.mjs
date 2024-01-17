import { EOF, TokenType } from './tokenizer.mjs'
import { BinaryExpr, Grouping, Identifier, Literal, UnaryExpr } from './ast.mjs'

function Parser(tokens){
    let pos = 0

    const peek = () => {
        if (pos < tokens.length){
            return tokens[pos]
        }
        return EOF
    }
    const advance = () => {
        const token = peek()
        if (pos < tokens.length) pos++
        return token
    }
    const match = (...types) => {
        if (peek().type === TokenType.END) return false

        for (const type of types){
            if (peek().type === type){
                return true
            }
        }
        return false
    }
    const consume = (type, err) => {
        if (match(type)){
            return advance()
        }
        throw new Error(`${peek().loc}: ${err}`)
    }

    this.parseExpression = function(){
        return this.parseAdditiveExpression()
    }
    this.parseAdditiveExpression = function(){
        let left = this.parseMultiplicativeExpression()

        while (match(TokenType.PLUS, TokenType.MINUS)){
            const op = advance()
            const right = this.parseMultiplicativeExpression()

            left = new BinaryExpr(left, op.value, right)
        }
        return left
    }
    this.parseMultiplicativeExpression = function(){
        let left = this.parseUnaryExpression()

        while (match(TokenType.MUL, TokenType.DIV)){
            const op = advance()
            const right = this.parseUnaryExpression()

            left = new BinaryExpr(left, op.value, right)
        }
        return left
    }
    this.parseUnaryExpression = function(){
        if (match(TokenType.MINUS)){
            const op = advance()
            const right = this.parseFactor()
            return new UnaryExpr(right, op.value)
        }
        return this.parseFactor()
    }
    this.parseFactor = function(){
        if (match(TokenType.LPAREN)){
            return this.parseGroup()
        } else if (match(TokenType.INT_LITERAL)){
            return this.parseIntLiteral()
        } else if (match(TokenType.IDENTIFIER)){
            return this.parseIdentifier()
        }
        throw new Error(`Expected one of ${[TokenType.LPAREN, TokenType.INT_LITERAL, TokenType.IDENTIFIER].join(', ')} got ${peek().type} instead`)
    }
    this.parseGroup = function(){
        consume(TokenType.LPAREN, `Expected "(" got ${peek().type}`)
        const expr = this.parseExpression()
        consume(TokenType.RPAREN, `Expected ")" got ${peek().type}`)
        return new Grouping(expr)
    }

    this.parseIdentifier = function(){
        const token = consume(TokenType.IDENTIFIER, `Expected identifier, got ${peek().type}`)
        return new Identifier(token.value)
    }
    this.parseIntLiteral = function(){
        const token = consume(TokenType.INT_LITERAL, `Expected an integer literal, got ${peek().type}`)
        return new Literal(token.value)
    }
    this.parseBoolLiteral = function(){
        const token = consume(TokenType.BOOL_LITERAL, `Expected a bool literal, got ${peek().type}`)
        return new Literal(token.value === 'true')
    }
}

export { Parser }