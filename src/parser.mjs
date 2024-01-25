import { EOF, TokenType } from './tokenizer.mjs'
import { 
    Assignment,
    BinaryExpr,
    Block,
    Call,
    Declaration,
    Grouping,
    Identifier,
    IfExpr,
    Literal,
    LogicalExpr,
    UnaryExpr,
    WhileExpr
} from './ast.mjs'

function Parser(tokens){
    let pos = 0
    let left_precedence_ops = [
        { types: [TokenType.OR], produces: LogicalExpr },
        { types: [TokenType.AND], produces: LogicalExpr },
        { types: [TokenType.EQ_EQ, TokenType.NE], produces: LogicalExpr },
        { types: [TokenType.LT, TokenType.LE, TokenType.GT, TokenType.GE], produces: LogicalExpr },
        { types: [TokenType.PLUS, TokenType.MINUS], produces: BinaryExpr },
        { types: [TokenType.MUL, TokenType.DIV], produces: BinaryExpr }
    ]

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
    const expect = (type, err) => {
        if (match(type)){
            return advance()
        }
        throw new Error(`${peek().loc}: ${err}`)
    }
    const isBlock = (expr) => {
        if (expr instanceof IfExpr) {
            if (expr.elsz) return expr.elsz instanceof Block
            return expr.body instanceof Block
        }
        return expr instanceof Block
    }

    this.parseExpression = function(){
        let expr = this.__parseExpression()
        expect(TokenType.END, `EOF expected, got ${peek().type}`)
        return expr
    }
    this.__parseExpression = function(){
        if (match(TokenType.IF)) return this.parseIfExpression()
        if (match(TokenType.VAR)) return this.parseVarDeclaration()
        if (match(TokenType.WHILE)) return this.parseWhileExpression()
        if (match(TokenType.LBRACE)) return this.parseBlockExpression()
        return this.parseAssignment()
    }
    this.parseIfExpression = function(){
        expect(TokenType.IF, `Expected ${TokenType.IF}, got ${peek().type}`)
        const cond = this.parseLeftPrecedenceExpr()
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
    this.parseWhileExpression = function(){
        expect(TokenType.WHILE, `Expected ${TokenType.WHILE}, got ${peek().type}`)
        const cond = this.parseLeftPrecedenceExpr()
        expect(TokenType.DO, `Expected ${TokenType.DO}, got ${peek().type}`)
        const body = this.__parseExpression()
        return new WhileExpr(cond, body)
    }
    this.parseBlockExpression = function(){
        expect(TokenType.LBRACE, `Expected ${TokenType.LBRACE}, got ${peek().type}`)
        const exprs = []
        
        while (!match(TokenType.RBRACE) && !match(TokenType.END)){
            exprs.push(this.__parseExpression())

            // TODO: insert literal with value null if final semicolon is present. See Task 6
            if (!match(TokenType.RBRACE) && !isBlock(exprs[exprs.length - 1])){
                expect(TokenType.SEMICOLON, `Missing ${TokenType.SEMICOLON} at ${peek().type}`)
            } else if (match(TokenType.SEMICOLON)) {
                advance()
            }
        }
        expect(TokenType.RBRACE, `Missing ${TokenType.RBRACE} at ${peek().type}`)
        return new Block(exprs)
    }
    this.parseAssignment = function(){
        const expr = this.parseLeftPrecedenceExpr()

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
    this.parseLeftPrecedenceExpr = function(){
        const ops = [...left_precedence_ops]
        const current_level = ops.shift()

        return this.__parseLeftPrecedenceExpr(current_level, ops)
    }
    this.__parseLeftPrecedenceExpr = function(current_level, more){
        const next_level = more.shift()
        const mm = [...more]
        
        let left = next_level ? this.__parseLeftPrecedenceExpr(next_level, more) : this.parseUnaryExpression()

        while (match(...current_level.types)){
            const op = advance()
            const right = next_level ? this.__parseLeftPrecedenceExpr(next_level, mm) : this.parseUnaryExpression()

            left = new current_level.produces(left, op.value, right)
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
        } else if (match(TokenType.BOOL_LITERAL)){
            return this.parseBoolLiteral()
        } else if (match(TokenType.UNIT_LITERAL)){
            return this.parseUnitLiteral()
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
    this.parseUnitLiteral = function(){
        expect(TokenType.UNIT_LITERAL, `Expected a unit literal, got ${peek().type}`)
        return new Literal(null)
    }
}

export { Parser }