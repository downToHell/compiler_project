import { SymTab } from './symtab.mjs'
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
import { TokenType } from './tokenizer.mjs'

function Interpreter(_env){
    let env = _env || new SymTab()
    env.addIfAbsent(TokenType.PLUS, (a, b) => a + b)
    env.addIfAbsent(TokenType.MINUS, (a, b) => a - b)
    env.addIfAbsent(TokenType.MUL, (a, b) => a * b)
    env.addIfAbsent(TokenType.DIV, (a, b) => parseInt(a / b))
    env.addIfAbsent(TokenType.MOD, (a, b) => a % b)
    env.addIfAbsent(TokenType.POW, (a, b) => Math.pow(a, b))
    env.addIfAbsent(TokenType.EQ_EQ, (a, b) => a === b)
    env.addIfAbsent(TokenType.NE, (a, b) => a !== b)
    env.addIfAbsent(TokenType.LT, (a, b) => a < b)
    env.addIfAbsent(TokenType.LE, (a, b) => a <= b)
    env.addIfAbsent(TokenType.GT, (a, b) => a > b)
    env.addIfAbsent(TokenType.GE, (a, b) => a >= b)
    env.addIfAbsent(TokenType.NOT, (a) => !a)
    env.addIfAbsent(TokenType.UNARY_MINUS, (a) => -a)

    this.interpret = function(node){
        switch(node.constructor){
            case Literal: return node.value
            case Identifier: return env.getSymbol(node.name)
            case BinaryExpr: return this.evaluateBinaryExpr(node)
            case LogicalExpr: return this.evaluateLogicalExpr(node)
            case UnaryExpr: return this.evaluateUnaryExpr(node)
            case Grouping: return this.interpret(node.expr)
            case Block: return this.evaluateBlock(node)
            case IfExpr: return this.evaluateIfExpr(node)
            case WhileExpr: return this.evaluateWhileExpression(node)
            case Call: return this.evaluateCall(node)
            case Declaration: return this.evaluateDeclaration(node)
            case Assignment: return this.evaluateAssignment(node)
            default: {
                throw new Error(`Unknown ast node: ${node.constructor.name}`)
            }
        }
    }
    this.evaluateBinaryExpr = function(node){
        return this.evaluateCall({ target: { name: node.op }, args: [node.left, node.right] })
    }
    this.evaluateLogicalExpr = function(node){
        switch(node.op){
            case TokenType.OR: return this.interpret(node.left) || this.interpret(node.right)
            case TokenType.AND: return this.interpret(node.left) && this.interpret(node.right)
            default: return this.evaluateBinaryExpr(node)
        }
    }
    this.evaluateUnaryExpr = function(node){
        const name = node.op === TokenType.MINUS ? TokenType.UNARY_MINUS : node.op
        return this.evaluateCall({ target: { name }, args: [node.right] })
    }
    this.evaluateBlock = function(node){
        env = new SymTab(env)
        let last

        for (const e of node.exprs){
            last = this.interpret(e)
        }
        env = env.getParent()
        return last
    }
    this.evaluateIfExpr = function(node){
        if (this.interpret(node.cond)){
            return this.interpret(node.body)
        } else if (node.elsz){
            return this.interpret(node.elsz)
        }
        return null
    }
    this.evaluateWhileExpression = function(node){
        while (this.interpret(node.cond)){
            this.interpret(node.body)
        }
        return null
    }
    this.evaluateCall = function(node){
        const fn = env.getSymbol(node.target.name)
        return fn(...node.args.map(f => this.interpret(f)))
    }
    this.evaluateDeclaration = function(node){
        const value = this.interpret(node.initializer)
        env.addSymbol(node.ident.name, value)
        return value
    }
    this.evaluateAssignment = function(node){
        const value = this.interpret(node.expr)
        env.setSymbol(node.target.name, value)
        return value
    }
}

export { Interpreter }