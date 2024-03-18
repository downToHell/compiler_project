import * as ast from './ast.mjs'
import { SymTab } from './symtab.mjs'
import { TokenType } from './tokenizer.mjs'

function Ref(_var){
    this._var = _var
}
function Break(){}
function Continue(){}
function Return(value){
    this.value = value
}

function Interpreter(_env){
    let env = _env || new SymTab()
    env.addIfAbsent(TokenType.PLUS, (a, b) => a + b)
    env.addIfAbsent(TokenType.MINUS, (a, b) => a - b)
    env.addIfAbsent(TokenType.STAR, (a, b) => a * b)
    env.addIfAbsent(TokenType.DIV, (a, b) => parseInt(a / b))
    env.addIfAbsent(TokenType.MOD, (a, b) => a % b)
    env.addIfAbsent(TokenType.POW, (a, b) => Math.pow(a, b))
    env.addIfAbsent(TokenType.EQ_EQ, (a, b) => a === b)
    env.addIfAbsent(TokenType.NE, (a, b) => a !== b)
    env.addIfAbsent(TokenType.LT, (a, b) => a < b)
    env.addIfAbsent(TokenType.LE, (a, b) => a <= b)
    env.addIfAbsent(TokenType.GT, (a, b) => a > b)
    env.addIfAbsent(TokenType.GE, (a, b) => a >= b)
    env.addIfAbsent(TokenType.AMP, (a) => new Ref(a))
    env.addIfAbsent(TokenType.NOT, (a) => !a)
    env.addIfAbsent(TokenType.UNARY_STAR, (a) => a._var)
    env.addIfAbsent(TokenType.UNARY_MINUS, (a) => -a)

    const resolveRef = (a) => {
        if (a instanceof ast.Identifier){
            return a.name
        } else if (a instanceof ast.UnaryExpr){
            const op = ast.encodeOp(a.op)

            if (op === TokenType.UNARY_STAR){
                return env.getSymbol(op)(env.getSymbol(resolveRef(a.right)))
            }
        } else if (a instanceof ast.Grouping){
            return resolveRef(a.expr)
        }
        throw new Error(`Illegal reference: ${a}`)
    }

    this.interpret = function(node){
        switch(node.constructor){
            case ast.Literal: return node.value
            case ast.Identifier: return env.getSymbol(node.name)
            case ast.BinaryExpr: return this.evaluateBinaryExpr(node)
            case ast.LogicalExpr: return this.evaluateLogicalExpr(node)
            case ast.UnaryExpr: return this.evaluateUnaryExpr(node)
            case ast.Grouping: return this.interpret(node.expr)
            case ast.Block: return this.evaluateBlock(node)
            case ast.IfExpr: return this.evaluateIfExpr(node)
            case ast.WhileExpr: return this.evaluateWhileExpression(node)
            case ast.Break: throw new Break()
            case ast.Continue: throw new Continue()
            case ast.Call: return this.evaluateCall(node)
            case ast.FunDecl: return this.evaluateFunDeclaration(node)
            case ast.Return: return this.evaluateReturnExpression(node)
            case ast.VarDecl: return this.evaluateVarDeclaration(node)
            case ast.Assignment: return this.evaluateAssignment(node)
            case ast.TypeExpr: return this.interpret(node.expr)
            case ast.Module: return node.exprs.map(n => this.interpret(n))
            default: {
                throw new Error(`Unknown ast node: ${node.constructor.name}`)
            }
        }
    }
    this.evaluateBinaryExpr = function(node){
        return this.evaluateCall(ast.makeCall(node.op, [node.left, node.right], node.loc))
    }
    this.evaluateLogicalExpr = function(node){
        switch(node.op){
            case TokenType.OR: return this.interpret(node.left) || this.interpret(node.right)
            case TokenType.AND: return this.interpret(node.left) && this.interpret(node.right)
            default: return this.evaluateBinaryExpr(node)
        }
    }
    this.evaluateUnaryExpr = function(node){
        const op = ast.encodeOp(node.op)
        
        if (op === TokenType.AMP){
            return env.getSymbol(node.op)(node.right.name)
        } else if (op === TokenType.UNARY_STAR){
            return env.getSymbol(resolveRef(node))
        }
        return this.evaluateCall(ast.makeCall(op, [node.right], node.loc))
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
            try {
                this.interpret(node.body)
            } catch (e){
                if (e instanceof Break) break
                if (e instanceof Continue) continue
                throw e
            }
        }
        return null
    }
    this.evaluateCall = function(node){
        const fn = env.getSymbol(resolveRef(node.target))

        try {
            return fn(...node.args.map(f => this.interpret(f)))
        } catch (e){
            if (e instanceof Return) return e.value
            throw e
        }
    }
    this.evaluateFunDeclaration = function(node){
        env.addSymbol(node.ident.name, (...args) => {
            env = new SymTab(env)

            if (args.length < node.args.length){
                throw new Error(`Missing arguments for ${node.ident.name}`)
            } else if (args.length > node.args.length){
                throw new Error(`Too many arguments for ${node.ident.name}`)
            }
            node.args.forEach((f, i) => env.addSymbol(f.expr.name, args[i]))
            const ret = this.interpret(node.body)
            env = env.getParent()
            return ret
        })
        return null
    }
    this.evaluateReturnExpression = function(node){
        throw new Return(this.interpret(node.value))
    }
    this.evaluateVarDeclaration = function(node){
        const value = this.interpret(node.initializer)
        env.addSymbol(node.ident.name, value)
        return value
    }
    this.evaluateAssignment = function(node){
        const value = this.interpret(node.expr)
        env.setSymbol(resolveRef(node.target), value)
        return value
    }
}

export { Interpreter }