import { EOF, TokenType } from './tokenizer.mjs'
import { Assignment, BinaryExpr, Block, Call, Declaration, Grouping, Identifier, IfExpr, Literal, LogicalExpr, UnaryExpr } from './ast.mjs'

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
        for (const type of types){
            if (peek().type === type){
                return true
            }
        }
        return false
    }
    const consume = (type) => {
        if (match(type)){
            advance()
        }
    }
    const expect = (type, err) => {
        if (match(type)){
            return advance()
        }
        throw new Error(`${peek().loc}: ${err}`)
    }

    this.parseExpression = function(){
        let expr = this.__parseExpression()
        expect(TokenType.END, `EOF expected, got ${peek().type}`)
        return expr
    }
    this.__parseExpression = function(){
        if (match(TokenType.IF)) return this.parseIfExpression()
        if (match(TokenType.VAR)) return this.parseVarDeclaration()
        if (match(TokenType.LBRACE)) return this.parseBlockExpression()
        return this.parseAssignment()
    }
    this.parseIfExpression = function(){
        expect(TokenType.IF, `Expected ${TokenType.IF}, got ${peek().type}`)
        const cond = this.parseOrExpression()
        expect(TokenType.THEN, `Expected ${TokenType.THEN}, got ${peek().type}`)

        const body = this.__parseExpression()
        let elsz
        
        if (match(TokenType.ELSE)){
            advance()
            elsz = this.__parseExpression()
        }
        return new IfExpr(cond, body, elsz)
    }
    this.parseVarDeclaration = function(){
        expect(TokenType.VAR, `Expected ${TokenType.VAR}, got ${peek().type}`)
        const ident = this.parseIdentifier()
        expect(TokenType.EQ, `Expected ${TokenType.EQ}, got ${peek().type}`)
        const initializer = this.__parseExpression()
        return new Declaration(ident, initializer)
    }
    this.parseBlockExpression = function(){
        expect(TokenType.LBRACE, `Expected ${TokenType.LBRACE}, got ${peek().type}`)
        const exprs = []
        
        while (!match(TokenType.RBRACE) && !match(TokenType.END)){
            exprs.push(this.__parseExpression())

            if (!match(TokenType.RBRACE)){
                expect(TokenType.SEMICOLON, `Missing ${TokenType.SEMICOLON} at ${peek().type}`)
            } else {
                consume(TokenType.SEMICOLON)
            }
        }
        expect(TokenType.RBRACE, `Missing ${TokenType.RBRACE} at ${peek().type}`)
        return new Block(exprs)
    }
    this.parseAssignment = function(){
        const expr = this.parseOrExpression()

        if (match(TokenType.EQ)){
            advance()
            const value = this.__parseExpression()

            if (expr instanceof Identifier){
                return new Assignment(expr, value)
            }
            throw new Error('Invalid assignment target!')
        }
        return expr
    }
    this.parseOrExpression = function(){
        let left = this.parseAndExpression()

        while (match(TokenType.OR)){
            const op = advance()
            const right = this.parseAndExpression()

            left = new LogicalExpr(left, op.value, right)
        }
        return left
    }
    this.parseAndExpression = function(){
        let left = this.parseEquality()

        while (match(TokenType.AND)){
            const op = advance()
            const right = this.parseEquality()

            left = new LogicalExpr(left, op.value, right)
        }
        return left
    }
    this.parseEquality = function(){
        let left = this.parseComparison()

        while (match(TokenType.EQ_EQ, TokenType.NE)){
            const op = advance()
            const right = this.parseComparison()

            left = new LogicalExpr(left, op.value, right)
        }
        return left
    }
    this.parseComparison = function(){
        let left = this.parseAdditiveExpression()

        while (match(TokenType.GT, TokenType.GE, TokenType.LT, TokenType.LE)){
            const op = advance()
            const right = this.parseAdditiveExpression()

            left = new LogicalExpr(left, op.value, right)
        }
        return left
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

        while (match(TokenType.MUL, TokenType.DIV, TokenType.MOD)){
            const op = advance()
            const right = this.parseUnaryExpression()

            left = new BinaryExpr(left, op.value, right)
        }
        return left
    }
    this.parseUnaryExpression = function(){
        if (match(TokenType.MINUS, TokenType.NOT)){
            const op = advance()
            const right = this.parseUnaryExpression()
            return new UnaryExpr(right, op.value)
        }
        return this.parseFunctionCall()
    }
    this.parseFunctionCall = function(){
        const expr = this.parseFactor()

        if (match(TokenType.LPAREN)){
            advance()
            const args = []

            if (!match(TokenType.RPAREN)){
                args.push(this.__parseExpression())

                while (match(TokenType.COMMA)){
                    advance()
                    args.push(this.__parseExpression())
                }
            }
            expect(TokenType.RPAREN, `Expected ")" got ${peek().type}`)
            return new Call(expr, args)
        }
        return expr
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
        expect(TokenType.LPAREN, `Expected "(" got ${peek().type}`)
        const expr = this.__parseExpression()
        expect(TokenType.RPAREN, `Expected ")" got ${peek().type}`)
        return new Grouping(expr)
    }

    this.parseIdentifier = function(){
        const token = expect(TokenType.IDENTIFIER, `Expected identifier, got ${peek().type}`)
        return new Identifier(token.value)
    }
    this.parseIntLiteral = function(){
        const token = expect(TokenType.INT_LITERAL, `Expected an integer literal, got ${peek().type}`)
        return new Literal(token.value)
    }
    this.parseBoolLiteral = function(){
        const token = expect(TokenType.BOOL_LITERAL, `Expected a bool literal, got ${peek().type}`)
        return new Literal(token.value === 'true')
    }
}

export { Parser }