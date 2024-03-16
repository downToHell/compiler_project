import * as ast from './ast.mjs'
import { Token, TokenType } from './tokenizer.mjs'
import { SourceLocation } from './source_context.mjs'

const LVL_TOP = 1
const LVL_LOOP = 2
const LVL_FUN = 4

function ParserContext(tokens){
    let level = LVL_TOP
    let pos = 0

    const EOF = () => {
        const loc = tokens.length > 0 ? tokens[tokens.length - 1].loc : new SourceLocation(0, 0)
        return new Token('', TokenType.END, loc)
    }
    const hasReturn = (node) => {
        if (node === undefined) return true // we don't consider empty nodes
        switch(node.constructor){
            case ast.Return: return true
            case ast.WhileExpr: return hasReturn(node.body)
            case ast.IfExpr: return hasReturn(node.body) && hasReturn(node.elsz)
            case ast.Block: return node.exprs.some(e => hasReturn(e))
            default: return false
        }
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
    this.expectLoop = (type) => {
        if (!this.isLoopLevel()){
            const expr = type === TokenType.BREAK ? 'break' : 'continue'
            throw new Error(`${this.peek().loc}: can't ${expr} because there is no active loop`)
        }
        this.expect(type, `Expected ${type}, got ${this.peek().type}`)
    }
    this.lookbehind = (type) => {
        return this.prev().type === type
    }
    this.isBlock = (expr) => {
        if (expr instanceof ast.IfExpr) {
            if (expr.elsz) return expr.elsz instanceof ast.Block
            return expr.body instanceof ast.Block
        } else if (expr instanceof ast.WhileExpr){
            return expr.body instanceof ast.Block
        }
        return expr instanceof ast.Block
    }
    this.isAssignable = (expr) => {
        if (expr instanceof ast.Identifier){
            return true
        } else if (expr instanceof ast.UnaryExpr && expr.op === TokenType.STAR){
            return true
        }
        return false
    }
    this.isTopLevel = () => (level & LVL_TOP) === LVL_TOP
    this.isLoopLevel = () => (level & LVL_LOOP) === LVL_LOOP
    this.replaceLevel = (l1, l2) => {
        this.exitLevel(l1)
        this.enterLevel(l2)
    }
    this.enterLevel = (l) => level |= l
    this.exitLevel = (l) => level &= ~l
    this.pos = () => pos

    this.checkReturn = (exprs) => {
        if (exprs.length === 0){
            const unit = new ast.Literal(null, this.prev().loc)
            exprs.push(new ast.Return(unit, this.prev().loc))
        } else if (!hasReturn(exprs.at(-1))) {
            const last = exprs.pop()
            exprs.push(new ast.Return(last, last.loc))
        }
    }
}

function Parser(tokens, options){
    const leftPrecedenceOps = [
        { types: [TokenType.OR], produces: ast.LogicalExpr },
        { types: [TokenType.AND], produces: ast.LogicalExpr },
        { types: [TokenType.EQ_EQ, TokenType.NE], produces: ast.LogicalExpr },
        { types: [TokenType.LT, TokenType.LE, TokenType.GT, TokenType.GE], produces: ast.LogicalExpr },
        { types: [TokenType.PLUS, TokenType.MINUS], produces: ast.BinaryExpr },
        { types: [TokenType.STAR, TokenType.DIV, TokenType.MOD], produces: ast.BinaryExpr },
        { types: [TokenType.POW], produces: ast.BinaryExpr }
    ]
    const ctx = new ParserContext(tokens)

    options = options || {}
    const { fallthrough } = options

    const { 
        peek, prev, advance, match,
        consume, expect, isBlock,
        lookbehind, checkReturn,
        enterLevel, replaceLevel,
        exitLevel, expectLoop,
        isAssignable
    } = ctx

    const powTokenFix = () => {
        const pow = tokens.splice(ctx.pos(), 1)[0]
        tokens.splice(ctx.pos(), 0,
            new Token(TokenType.STAR, TokenType.STAR, new SourceLocation(pow.loc.column, pow.loc.line)),
            new Token(TokenType.STAR, TokenType.STAR, new SourceLocation(pow.loc.column+1, pow.loc.line)) 
        )
    }

    this.parse = function(){
        return this.parseModule(peek().loc)
    }
    this.parseModule = function(loc){
        let exprs = []

        if (fallthrough && peek().type == TokenType.END){
            return new ast.Module(exprs, loc)
        }

        do {
            exprs.push(this.parseExpression(peek().loc))
        } while ((consume(TokenType.SEMICOLON) || lookbehind(TokenType.RBRACE)) && peek().type != TokenType.END)
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
        const type = this.parseTypeId(peek().loc)
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
        const retType = this.parseTypeId(peek().loc)
        let body
        replaceLevel(LVL_TOP, LVL_FUN)

        if (match(TokenType.LBRACE)){
            body = this.parseBlockExpression(peek().loc)
            checkReturn(body.exprs)
        } else if (consume(TokenType.EQ)) {
            body = new ast.Return(this.parseLeftPrecedenceExpr(peek().loc), peek().loc)
        } else {
            throw new Error(`${loc}: Expected ${[TokenType.LBRACE, TokenType.EQ].join(', ')}, got ${peek().type}`)
        }
        replaceLevel(LVL_FUN, LVL_TOP)
        return new ast.FunDecl(ident, args, retType, body, loc)
    }
    this.parseReturnExpression = function(loc){
        if (ctx.isTopLevel()){
            throw new Error(`${loc}: Can't return from top-level code`)
        }
        expect(TokenType.RETURN, `Expected ${TokenType.RETURN}, got ${peek().type}`)
        let value

        if (!consume(TokenType.SEMICOLON)){
            value = this.parseExpression(peek().loc)
        } else {
            value = new ast.Literal(null, peek().loc)
        }
        return new ast.Return(value, loc)
    }
    this.parseTypeId = function(loc){
        const typeId = this.parseIdentifier(peek().loc)
        let refDepth = 0

        while (match(TokenType.STAR, TokenType.POW)){
            refDepth += advance().type === TokenType.POW ? 2 : 1
        }
        return new ast.TypeId(typeId, refDepth, loc)
    }
    this.parseVarDeclaration = function(loc){
        expect(TokenType.VAR, `Expected ${TokenType.VAR}, got ${peek().type}`)
        const ident = this.parseIdentifier(peek().loc)
        let type

        if (consume(TokenType.COLON)){
            type = this.parseTypeId(peek().loc)
        }
        expect(TokenType.EQ, `Expected ${TokenType.EQ}, got ${peek().type}`)
        const initializer = this.parseExpression(peek().loc)

        return new ast.VarDecl(ident, type ? new ast.TypeExpr(type, initializer, loc) : initializer, loc)
    }
    this.parseWhileExpression = function(loc){
        expect(TokenType.WHILE, `Expected ${TokenType.WHILE}, got ${peek().type}`)
        const cond = this.parseLeftPrecedenceExpr(peek().loc)
        expect(TokenType.DO, `Expected ${TokenType.DO}, got ${peek().type}`)
        enterLevel(LVL_LOOP)
        const body = this.parseExpression(peek().loc)
        exitLevel(LVL_LOOP)
        return new ast.WhileExpr(cond, body, loc)
    }
    this.parseBreak = function(loc){
        expectLoop(TokenType.BREAK)
        return new ast.Break(loc)
    }
    this.parseContinue = function(loc){
        expectLoop(TokenType.CONTINUE)
        return new ast.Continue(loc)
    }
    this.parseBlockExpression = function(loc){
        expect(TokenType.LBRACE, `Expected ${TokenType.LBRACE}, got ${peek().type}`)
        const exprs = []
        
        while (!match(TokenType.RBRACE) && !match(TokenType.END)){
            exprs.push(this.parseExpression(peek().loc))

            if (!match(TokenType.RBRACE) && !isBlock(exprs.at(-1))){
                expect(TokenType.SEMICOLON, `Missing ${TokenType.SEMICOLON} at ${peek().type}`)
            } else {
                consume(TokenType.SEMICOLON)
            }
        }

        if (lookbehind(TokenType.SEMICOLON)){
            exprs.push(new ast.Literal(null, prev().loc))
        }
        expect(TokenType.RBRACE, `Missing ${TokenType.RBRACE} at ${peek().type}`)
        return new ast.Block(exprs, loc)
    }
    this.parseAssignment = function(loc){
        const expr = this.parseLeftPrecedenceExpr(peek().loc)

        if (consume(TokenType.EQ)){
            const value = this.parseExpression(peek().loc)

            if (isAssignable(expr)){
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
        if (match(TokenType.POW)) powTokenFix()
        if (match(TokenType.MINUS, TokenType.STAR, TokenType.NOT)){
            const op = advance()
            const right = this.parseUnaryExpression(peek().loc)
            return new ast.UnaryExpr(right, op.value, loc)
        } else if (match(TokenType.AMP)){
            const op = advance()
            const right = this.parseIdentifier(peek().loc)
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
        if (match(TokenType.RETURN)) return this.parseReturnExpression(loc)
        if (match(TokenType.VAR)) return this.parseVarDeclaration(loc)
        if (match(TokenType.WHILE)) return this.parseWhileExpression(loc)
        if (match(TokenType.BREAK)) return this.parseBreak(loc)
        if (match(TokenType.CONTINUE)) return this.parseContinue(loc)
        if (match(TokenType.LBRACE)) return this.parseBlockExpression(loc)
        if (match(TokenType.LPAREN)) return this.parseGroup(loc)
        if (match(TokenType.INT_LITERAL)) return this.parseIntLiteral(loc)
        if (match(TokenType.BOOL_LITERAL)) return this.parseBoolLiteral(loc)
        if (match(TokenType.UNIT_LITERAL)) return this.parseUnitLiteral(loc)
        if (match(TokenType.IDENTIFIER)) return this.parseIdentifier(loc)
        throw new Error(`${loc}: Expected one of ${[TokenType.IF, TokenType.FUN, TokenType.RETURN, TokenType.VAR, TokenType.WHILE, TokenType.LBRACE, TokenType.LPAREN, TokenType.INT_LITERAL, TokenType.BOOL_LITERAL, TokenType.UNIT_LITERAL, TokenType.IDENTIFIER].join(', ')} got ${peek().type} instead`)
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