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
    UnaryExpr } from './ast.mjs'

function Interpreter(_env){
    const env = _env || new SymTab()

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
            case Call: return this.evaluateCall(node)
            case Declaration: return this.evaluateDeclaration(node)
            case Assignment: return this.evaluateAssignment(node)
            default: {
                throw new Error(`Unknown ast node: ${node.constructor.name}`)
            }
        }
    }
    this.evaluateBinaryExpr = function(node){
        const a = this.interpret(node.left)
        const b = this.interpret(node.right)

        switch(node.op){
            case '+': return a + b
            case '-': return a - b
            case '*': return a * b
            case '/': return parseInt(a / b)
            case '%': return a % b
            default: {
                throw new Error(`Invalid operator: ${node.op}`)
            }
        }
    }
    this.evaluateLogicalExpr = function(node){
        const a = this.interpret(node.left)

        switch(node.op){
            case 'or': return a || this.interpret(node.right)
            case 'and': return a && this.interpret(node.right)
            case '==': return a === this.interpret(node.right)
            case '!=': return a !== this.interpret(node.right)
            case '<': return a < this.interpret(node.right)
            case '<=': return a <= this.interpret(node.right)
            case '>': return a > this.interpret(node.right)
            case '>=': return a >= this.interpret(node.right)
            default: {
                throw new Error(`Invalid operator: ${node.op}`)
            }
        }
    }
    this.evaluateUnaryExpr = function(node){
        const a = this.interpret(node.right)

        switch(node.op){
            case 'not': return !a
            case '-': return -a
            default: {
                throw new Error(`Invalid operator: ${node.op}`)
            }
        }
    }
    this.evaluateBlock = function(node){
        let last

        for (const e of node.exprs){
            last = this.interpret(e)
        }
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