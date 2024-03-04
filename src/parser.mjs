import * as ast from './ast.mjs'
import { Token, TokenType } from './tokenizer.mjs'
import { SourceLocation } from './source_context.mjs'

function ParserContext(tokens){
    let pos = 0

    const EOF = () => {
        const loc = tokens.length > 0 ? tokens[tokens.length - 1].loc : new SourceLocation(0, 0)
        return new Token('', TokenType.END, loc)
    }
    this.peek = () => {
        if (pos < tokens.length){
            return tokens[pos]
        }
        return EOF()
    }
    this.prev = () => {
        if (pos > 0){
            return tokens[pos - 1]
        }
        return EOF()
    }
    this.advance = () => {
        const token = this.peek()
        if (pos < tokens.length) pos++
        return token
    }
    this.match = (...types) => {
        for (const type of types){
            if (this.peek().type === type){
                return true
            }
        }
        return false
    }
    this.consume = (type) => {
        if (this.match(type)){
            this.advance()
            return true
        }
        return false
    }
    this.expect = (type, err) => {
        if (this.match(type)){
            return this.advance()
        }
        throw new Error(`${this.peek().loc}: ${err}`)
    }
    this.isBlock = (expr) => {
        if (expr instanceof ast.IfExpr) {
            if (expr.elsz) return expr.elsz instanceof ast.Block
            return expr.body instanceof ast.Block
        }
        return expr instanceof ast.Block
    }
}

function Parser(tokens){
    const leftPrecedenceOps = [
        { types: [TokenType.OR], produces: ast.LogicalExpr },
        { types: [TokenType.AND], produces: ast.LogicalExpr },
        { types: [TokenType.EQ_EQ, TokenType.NE], produces: ast.LogicalExpr },
        { types: [TokenType.LT, TokenType.LE, TokenType.GT, TokenType.GE], produces: ast.LogicalExpr },
        { types: [TokenType.PLUS, TokenType.MINUS], produces: ast.BinaryExpr },
        { types: [TokenType.MUL, TokenType.DIV, TokenType.MOD], produces: ast.BinaryExpr },
        { types: [TokenType.POW], produces: ast.BinaryExpr }
    ]
    const ctx = new ParserContext(tokens)

    const { 
        peek, prev, advance,
        match, consume, expect,
        isBlock
    } = ctx

    this.parse = function(){
        return this.parseModule(peek().loc)
    }
    this.parseModule = function(loc){
        let exprs = []

        do {
            exprs.push(this.parseExpression(peek().loc))
        } while (consume(TokenType.SEMICOLON) && peek().type != TokenType.END)
        expect(TokenType.END, `EOF expected, got ${peek().type}`)
        return new ast.Module(exprs, loc)
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
        return new ast.IfExpr(cond, body, elsz, loc)
    }
    this.parseArgument = function(loc){
        const ident = this.parseIdentifier(peek().loc)
        expect(TokenType.COLON, `Expected ${TokenType.COLON}, got ${peek().type}`)
        const type = this.parseIdentifier(peek().loc)
        return new ast.TypeExpr(type, ident, loc)
    }
    this.parseArgumentList = function(){
        expect(TokenType.LPAREN, `Expected ${TokenType.LPAREN}, got ${peek().type}`)
        const args = []

        if (match(TokenType.IDENTIFIER)){
            do {
                args.push(this.parseArgument(peek().loc))
            } while (consume(TokenType.COMMA))
        }
        expect(TokenType.RPAREN, `Expected ${TokenType.RPAREN}, got ${peek().type}`)
        return args
    }
    this.parseFunDeclaration = function(loc){
        expect(TokenType.FUN, `Expected ${TokenType.FUN}, got ${peek().type}`)
        const ident = this.parseIdentifier(peek().loc)
        const args = this.parseArgumentList()
        expect(TokenType.COLON, `Expected ${TokenType.COLON}, got ${peek().type}`)
        const retType = this.parseIdentifier(peek().loc)
        let body

        if (match(TokenType.LBRACE)){
            body = this.parseBlockExpression(peek().loc)
        } else if (consume(TokenType.EQ)) {
            body = this.parseLeftPrecedenceExpr(peek().loc)
        } else {
            throw new Error(`${loc}: Expected ${[TokenType.LBRACE, TokenType.EQ].join(', ')}, got ${peek().type}`)
        }
        return new ast.FunDecl(ident, args, retType, body, loc)
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

        return new ast.VarDecl(ident, type ? new ast.TypeExpr(type, initializer, loc) : initializer, loc)
    }
    this.parseWhileExpression = function(loc){
        expect(TokenType.WHILE, `Expected ${TokenType.WHILE}, got ${peek().type}`)
        const cond = this.parseLeftPrecedenceExpr(peek().loc)
        expect(TokenType.DO, `Expected ${TokenType.DO}, got ${peek().type}`)
        const body = this.parseExpression(peek().loc)
        return new ast.WhileExpr(cond, body, loc)
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

        if (prev().type === TokenType.SEMICOLON){
            exprs.push(new ast.Literal(null, prev().loc))
        }
        expect(TokenType.RBRACE, `Missing ${TokenType.RBRACE} at ${peek().type}`)
        return new ast.Block(exprs, loc)
    }
    this.parseAssignment = function(loc){
        const expr = this.parseLeftPrecedenceExpr(peek().loc)

        if (consume(TokenType.EQ)){
            const value = this.parseExpression(peek().loc)

            if (expr instanceof ast.Identifier){
                return new ast.Assignment(expr, value, loc)
            }
            throw new Error(`${loc}: Invalid assignment target!`)
        }
        return expr
    }
    this.parseLeftPrecedenceExpr = function(loc){
        return this.__parseLeftPrecedenceExpr(0, leftPrecedenceOps, loc)
    }
    this.__parseLeftPrecedenceExpr = function(currentLevel, more, loc){
        const nextLevel = currentLevel + 1
        let left = nextLevel < more.length ? this.__parseLeftPrecedenceExpr(nextLevel, more, peek().loc) : this.parseUnaryExpression(peek().loc)

        while (match(...more[currentLevel].types)){
            const op = advance()
            const right = nextLevel < more.length ? this.__parseLeftPrecedenceExpr(nextLevel, more, peek().loc) : this.parseUnaryExpression(peek().loc)

            left = new more[currentLevel].produces(left, op.value, right, loc)
        }
        return left
    }
    this.parseUnaryExpression = function(loc){
        if (match(TokenType.MINUS, TokenType.NOT)){
            const op = advance()
            const right = this.parseUnaryExpression(peek().loc)
            return new ast.UnaryExpr(right, op.value, loc)
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
            return new ast.Call(expr, args, loc)
        }
        return expr
    }
    this.parseFactor = function(loc){
        if (match(TokenType.IF)) return this.parseIfExpression(loc)
        if (match(TokenType.FUN)) return this.parseFunDeclaration(loc)
        if (match(TokenType.VAR)) return this.parseVarDeclaration(loc)
        if (match(TokenType.WHILE)) return this.parseWhileExpression(loc)
        if (match(TokenType.LBRACE)) return this.parseBlockExpression(loc)
        if (match(TokenType.LPAREN)) return this.parseGroup(loc)
        if (match(TokenType.INT_LITERAL)) return this.parseIntLiteral(loc)
        if (match(TokenType.BOOL_LITERAL)) return this.parseBoolLiteral(loc)
        if (match(TokenType.UNIT_LITERAL)) return this.parseUnitLiteral(loc)
        if (match(TokenType.IDENTIFIER)) return this.parseIdentifier(loc)
        throw new Error(`${loc}: Expected one of ${[TokenType.IF, TokenType.FUN, TokenType.VAR, TokenType.WHILE, TokenType.LBRACE, TokenType.LPAREN, TokenType.INT_LITERAL, TokenType.BOOL_LITERAL, TokenType.UNIT_LITERAL, TokenType.IDENTIFIER].join(', ')} got ${peek().type} instead`)
    }
    this.parseGroup = function(loc){
        expect(TokenType.LPAREN, `Expected "(" got ${peek().type}`)
        const expr = this.parseExpression(peek().loc)
        expect(TokenType.RPAREN, `Expected ")" got ${peek().type}`)
        return new ast.Grouping(expr, loc)
    }

    this.parseIdentifier = function(loc){
        const token = expect(TokenType.IDENTIFIER, `Expected identifier, got ${peek().type}`)
        return new ast.Identifier(token.value, loc)
    }
    this.parseIntLiteral = function(loc){
        const token = expect(TokenType.INT_LITERAL, `Expected an integer literal, got ${peek().type}`)
        return new ast.Literal(token.value, loc)
    }
    this.parseBoolLiteral = function(loc){
        const token = expect(TokenType.BOOL_LITERAL, `Expected a bool literal, got ${peek().type}`)
        return new ast.Literal(token.value === 'true', loc)
    }
    this.parseUnitLiteral = function(loc){
        expect(TokenType.UNIT_LITERAL, `Expected a unit literal, got ${peek().type}`)
        return new ast.Literal(null, loc)
    }
}

export { Parser }