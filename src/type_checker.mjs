import * as ast from './ast.mjs'
import { SymTab } from './symtab.mjs'
import { 
    ArithmeticOp,
    Bool,
    ComparisonOp,
    EqualityOp,
    Int,
    LogicalOp,
    PrintBoolFn,
    PrintIntFn,
    Unit
} from './types.mjs'
import { TokenType } from './tokenizer.mjs'

const ARITHMETIC_OPS = [TokenType.PLUS, TokenType.MINUS, TokenType.MUL,
                        TokenType.DIV, TokenType.MOD, TokenType.POW]
const EQUALITY_OPS = [TokenType.EQ_EQ, TokenType.NE]
const LOGICAL_OPS = [TokenType.AND, TokenType.OR]
const COMPARISON_OPS = [TokenType.LT, TokenType.LE, TokenType.GT, TokenType.GE]

function TypeChecker(){
    let env = new SymTab()
    env.addSymbols(ARITHMETIC_OPS, ArithmeticOp)
    env.addSymbols(EQUALITY_OPS, EqualityOp)
    env.addSymbols(LOGICAL_OPS, LogicalOp)
    env.addSymbols(COMPARISON_OPS, ComparisonOp)
    env.addSymbol('print_int', PrintIntFn)
    env.addSymbol('print_bool', PrintBoolFn)

    this.typecheck = function(node){
        switch(node.constructor){
            case ast.Literal: return this.typeOfLiteral(node)
            case ast.Identifier: return env.getSymbol(node.name)
            case ast.BinaryExpr: return this.typeOfBinaryExpr(node)
            case ast.LogicalExpr: return this.typeOfBinaryExpr(node)
            case ast.Call: return this.typeOfCall(node)
            case ast.Block: return this.typeOfBlock(node)
            case ast.IfExpr: return this.typeOfIfExpr(node)
            case ast.WhileExpr: return this.typeOfWhileExpr(node)
            case ast.Assignment: return this.typeOfAssignment(node)
            case ast.Declaration: return this.typeOfDeclaration(node)
            case ast.TypeExpr: return this.typeOfTypeExpr(node)
            default: throw new Error(`Unknown ast node: ${node.constructor.name}`)
        }
    }
    this.typeOfLiteral = function(node){
        if (typeof node.value === 'number'){
            return Int
        } else if (typeof node.value === 'boolean'){
            return Bool
        } else if (node.value === null){
            return Unit
        }
        throw new Error(`Unknown literal type: ${node.value}`)
    }
    this.typeOfBinaryExpr = function(node){
        return this.typeOfCall({ target: { name: node.op }, args: [node.left, node.right] })
    }
    this.typeOfCall = function(node){
        const fun = env.getSymbol(node.target.name)
        const args = node.args.map(f => this.typecheck(f))

        if (!fun.accept(...args)){
            throw new Error(`Function '${node.target.name}' expected ${fun.argStr()}, got (${args.join(', ')})`)
        }
        return fun.ret
    }
    this.typeOfBlock = function(node){
        env = new SymTab(env)
        let last

        for (let expr of node.exprs){
            last = this.typecheck(expr)
        }
        env = env.getParent()
        return last
    }
    this.typeOfIfExpr = function(node){
        const a = this.typecheck(node.cond)

        if (a !== Bool){
            throw new Error(`Condition of if-clause must be a Bool, got ${a} instead`)
        } else if (typeof node.elsz === 'undefined'){
            return Unit
        }
        const b = this.typecheck(node.body)
        const c = this.typecheck(node.elsz)

        if (b !== c){
            throw new Error('Types of then-clause and else-clause must match')
        }
        return b
    }
    this.typeOfWhileExpr = function(node){
        const a = this.typecheck(node.cond)

        if (a !== Bool){
            throw new Error(`Condition of when expression must be a Bool, got ${a} instead`)
        }
        this.typecheck(node.body)
        return Unit
    }
    this.typeOfDeclaration = function(node){
        const type = this.typecheck(node.initializer)
        env.addSymbol(node.ident.name, type)
        return type
    }
    this.typeOfAssignment = function(node){
        const type = this.typecheck(node.expr)

        if (env.getSymbol(node.target.name) !== type){
            throw new Error(`Reassignment of ${node.target.name} with type '${type}' is not allowed`)
        }
        env.setSymbol(node.target.name, type)
        return type
    }
    this.typeOfTypeExpr = function(node){
        const type = this.typecheck(node.expr)

        // TODO: only works for BasicTypes! Implement FunType?
        if (type.name !== node.type.name){
            throw new Error(`Invalid type expression: expected ${node.type.name}, got ${type}`)
        }
        return type
    }
}

export { TypeChecker }