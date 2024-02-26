import { Token, TokenType } from './tokenizer.mjs'
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
    Module,
    TypeExpr,
    UnaryExpr,
    WhileExpr
} from './ast.mjs'
import { SourceLocation } from './source_context.mjs'

function Parser(tokens){
    let pos = 0
    let left_precedence_ops = [
        { types: [TokenType.OR], produces: LogicalExpr },
        { types: [TokenType.AND], produces: LogicalExpr },
        { types: [TokenType.EQ_EQ, TokenType.NE], produces: LogicalExpr },
        { types: [TokenType.LT, TokenType.LE, TokenType.GT, TokenType.GE], produces: LogicalExpr },
        { types: [TokenType.PLUS, TokenType.MINUS], produces: BinaryExpr },
        { types: [TokenType.MUL, TokenType.DIV, TokenType.MOD], produces: BinaryExpr },
        { types: [TokenType.POW], produces: BinaryExpr }
    ]

    const EOF = () => {
        const loc = tokens.length > 0 ? tokens[tokens.length - 1].loc : new SourceLocation(0, 0)
        return new Token('', TokenType.END, loc)
    }
    const peek = () => {
        if (pos < tokens.length){
            return tokens[pos]
        }
        return EOF()
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
            return true
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

    this.parse = function(){
        return this.parseModule(peek().loc)
    }
    this.parseModule = function(loc){
        let exprs = []

        do {
            exprs.push(this.parseExpression(peek().loc))
        } while (consume(TokenType.SEMICOLON) && peek().type != TokenType.END)
        expect(TokenType.END, `EOF expected, got ${peek().type}`)
        return new Module(exprs, loc)
    }
    this.parseExpression = function(loc){
        return this.parseAssignment(loc)
    }
    this.parseIfExpression = function(loc){
        expect(TokenType.IF, `Expected ${TokenType.IF}, got ${peek().type}`)
        const cond = this.parseLeftPrecedenceExpr(peek().loc)
        expect(TokenType.THEN, `Expected ${TokenType.THEN}, got ${peek().type}`)

        const body = this.parseExpression(peek().loc)
        let elsz
        
        if (consume(TokenType.ELSE)){
            elsz = this.parseExpression(peek().loc)
        }
        return new IfExpr(cond, body, elsz, loc)
    }
    this.parseVarDeclaration = function(loc){
        expect(TokenType.VAR, `Expected ${TokenType.VAR}, got ${peek().type}`)
        const ident = this.parseIdentifier(peek().loc)
        let type

        if (consume(TokenType.COLON)){
            type = this.parseIdentifier(peek().loc)
        }
        expect(TokenType.EQ, `Expected ${TokenType.EQ}, got ${peek().type}`)
        const initializer = this.parseExpression(peek().loc)

        return new Declaration(ident, type ? new TypeExpr(type, initializer, loc) : initializer, loc)
    }
    this.parseWhileExpression = function(loc){
        expect(TokenType.WHILE, `Expected ${TokenType.WHILE}, got ${peek().type}`)
        const cond = this.parseLeftPrecedenceExpr(peek().loc)
        expect(TokenType.DO, `Expected ${TokenType.DO}, got ${peek().type}`)
        const body = this.parseExpression(peek().loc)
        return new WhileExpr(cond, body, loc)
    }
    this.parseBlockExpression = function(loc){
        expect(TokenType.LBRACE, `Expected ${TokenType.LBRACE}, got ${peek().type}`)
        const exprs = []
        
        while (!match(TokenType.RBRACE) && !match(TokenType.END)){
            exprs.push(this.parseExpression(peek().loc))

            if (!match(TokenType.RBRACE) && !isBlock(exprs[exprs.length - 1])){
                expect(TokenType.SEMICOLON, `Missing ${TokenType.SEMICOLON} at ${peek().type}`)
            } else if (match(TokenType.SEMICOLON)) {
                advance()
            }
        }

        if (tokens[pos - 1].type === TokenType.SEMICOLON){
            exprs.push(new Literal(null, tokens[pos - 1].loc))
        }
        expect(TokenType.RBRACE, `Missing ${TokenType.RBRACE} at ${peek().type}`)
        return new Block(exprs, loc)
    }
    this.parseAssignment = function(loc){
        const expr = this.parseLeftPrecedenceExpr(peek().loc)

        if (consume(TokenType.EQ)){
            const value = this.parseExpression(peek().loc)

            if (expr instanceof Identifier){
                return new Assignment(expr, value, loc)
            }
            throw new Error(`${loc}: Invalid assignment target!`)
        }
        return expr
    }
    this.parseLeftPrecedenceExpr = function(loc){
        return this.__parseLeftPrecedenceExpr(0, left_precedence_ops, loc)
    }
    this.__parseLeftPrecedenceExpr = function(current_level, more, loc){
        const next_level = current_level + 1
        let left = next_level < more.length ? this.__parseLeftPrecedenceExpr(next_level, more, peek().loc) : this.parseUnaryExpression(peek().loc)

        while (match(...more[current_level].types)){
            const op = advance()
            const right = next_level < more.length ? this.__parseLeftPrecedenceExpr(next_level, more, peek().loc) : this.parseUnaryExpression(peek().loc)

            left = new more[current_level].produces(left, op.value, right, loc)
        }
        return left
    }
    this.parseUnaryExpression = function(loc){
        if (match(TokenType.MINUS, TokenType.NOT)){
            const op = advance()
            const right = this.parseUnaryExpression(peek().loc)
            return new UnaryExpr(right, op.value, loc)
        }
        return this.parseFunctionCall(loc)
    }
    this.parseFunctionCall = function(loc){
        const expr = this.parseFactor(peek().loc)

        if (consume(TokenType.LPAREN)){
            const args = []

            if (!match(TokenType.RPAREN)){
                args.push(this.parseExpression(peek().loc))

                while (consume(TokenType.COMMA)){
                    args.push(this.parseExpression(peek().loc))
                }
            }
            expect(TokenType.RPAREN, `Expected ")" got ${peek().type}`)
            return new Call(expr, args, loc)
        }
        return expr
    }
    this.parseFactor = function(loc){
        if (match(TokenType.IF)) return this.parseIfExpression(loc)
        if (match(TokenType.VAR)) return this.parseVarDeclaration(loc)
        if (match(TokenType.WHILE)) return this.parseWhileExpression(loc)
        if (match(TokenType.LBRACE)) return this.parseBlockExpression(loc)
        if (match(TokenType.LPAREN)) return this.parseGroup(loc)
        if (match(TokenType.INT_LITERAL)) return this.parseIntLiteral(loc)
        if (match(TokenType.BOOL_LITERAL)) return this.parseBoolLiteral(loc)
        if (match(TokenType.UNIT_LITERAL)) return this.parseUnitLiteral(loc)
        if (match(TokenType.IDENTIFIER)) return this.parseIdentifier(loc)
        throw new Error(`${loc}: Expected one of ${[TokenType.IF, TokenType.VAR, TokenType.WHILE, TokenType.LBRACE, TokenType.LPAREN, TokenType.INT_LITERAL, TokenType.BOOL_LITERAL, TokenType.UNIT_LITERAL, TokenType.IDENTIFIER].join(', ')} got ${peek().type} instead`)
    }
    this.parseGroup = function(loc){
        expect(TokenType.LPAREN, `Expected "(" got ${peek().type}`)
        const expr = this.parseExpression(peek().loc)
        expect(TokenType.RPAREN, `Expected ")" got ${peek().type}`)
        return new Grouping(expr, loc)
    }

    this.parseIdentifier = function(loc){
        const token = expect(TokenType.IDENTIFIER, `Expected identifier, got ${peek().type}`)
        return new Identifier(token.value, loc)
    }
    this.parseIntLiteral = function(loc){
        const token = expect(TokenType.INT_LITERAL, `Expected an integer literal, got ${peek().type}`)
        return new Literal(token.value, loc)
    }
    this.parseBoolLiteral = function(loc){
        const token = expect(TokenType.BOOL_LITERAL, `Expected a bool literal, got ${peek().type}`)
        return new Literal(token.value === 'true', loc)
    }
    this.parseUnitLiteral = function(loc){
        expect(TokenType.UNIT_LITERAL, `Expected a unit literal, got ${peek().type}`)
        return new Literal(null, loc)
    }
}

export { Parser }