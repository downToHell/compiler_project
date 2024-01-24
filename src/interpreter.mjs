import { SymTab } from './symtab.mjs'
import { Assignment, BinaryExpr, Call, Declaration, Identifier, Literal, LogicalExpr, UnaryExpr } from './ast.mjs'

function Interpreter(_env){
    const env = _env || new SymTab()

    this.interpret = function(node){
        switch(node.constructor){
            case Literal: return node.value
            case Identifier: return env.getSymbol(node.name)
            case BinaryExpr: return this.evaluateBinaryExpr(node)
            case LogicalExpr: return this.evaluateLogicalExpr(node)
            case UnaryExpr: return this.evaluateUnaryExpr(node)
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
            case '/': return a / b
            case '%': return a % b
            default: {
                throw new Error(`Invalid operator: ${node.op}`)
            }
        }
    }
    this.evaluateLogicalExpr = function(node){
        const a = this.interpret(node.left)
        const b = this.interpret(node.right)

        switch(node.op){
            case 'or': return a || b
            case 'and': return a && b
            case '==': return a === b
            case '!=': return a !== b
            case '<': return a < b
            case '<=': return a <= b
            case '>': return a > b
            case '>=': return a >= b
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