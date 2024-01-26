import { SymTab } from './symtab.mjs'
import { Bool, Int, Unit } from './types.mjs'
import {
    Assignment,
    BinaryExpr,
    Block,
    Declaration,
    Identifier,
    IfExpr,
    Literal,
    LogicalExpr
} from './ast.mjs'
import { TokenType } from './tokenizer.mjs'

const ARITHMETIC_OPS = Object.freeze([
    TokenType.PLUS, TokenType.MINUS,
    TokenType.MUL, TokenType.DIV,
    TokenType.MOD, TokenType.POW
])
const EQUALITY_OPS = Object.freeze([TokenType.EQ_EQ, TokenType.NE])
const LOGICAL_OPS = Object.freeze([TokenType.AND, TokenType.OR])
const COMPARISON_OPS = Object.freeze([
    TokenType.LT, TokenType.LE,
    TokenType.GT, TokenType.GE
])

function TypeChecker(){
    const env = new SymTab()

    this.typecheck = function(node){
        switch(node.constructor){
            case Literal: return this.typeOfLiteral(node)
            case Identifier: return env.getSymbol(node.name)
            case BinaryExpr: return this.typeOfBinaryExpr(node)
            case LogicalExpr: return this.typeOfLogicalExpr(node)
            case Block: return this.typeOfBlock(node)
            case IfExpr: return this.typeOfIfExpr(node)
            case Assignment: return this.typeOfAssignment(node)
            case Declaration: return this.typeOfDeclaration(node)
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
        const a = this.typecheck(node.left)
        const b = this.typecheck(node.right)

        if (ARITHMETIC_OPS.includes(node.op)){
            if (!(a === Int && b === Int)){
                throw new Error(`Operand '${node.op}' expected to Ints, got ${a} and ${b}`)
            }
            return Int
        }
        throw new Error(`Invalid operant '${node.op}' for binary expression`)
    }
    this.typeOfLogicalExpr = function(node){
        const a = this.typecheck(node.left)
        const b = this.typecheck(node.right)

        if (COMPARISON_OPS.includes(node.op)){
            if (!(a === Int && b === Int)){
                throw new Error(`Operand '${node.op}' expected to Ints, got ${a} and ${b}`)
            }
            return Bool
        } else if (EQUALITY_OPS.includes(node.op)){
            if (a === Int && b === Int){
                return Bool
            } else if (a === Bool && b === Bool){
                return Bool
            }
            throw new Error(`Operand '${node.op}' expected two matching types, got ${a} and ${b}`)
        } else if (LOGICAL_OPS.includes(node.op)){
            if (!(a === Bool && b === Bool)){
                throw new Error(`Operand '${node.op}' expected to Booleans, got ${a} and ${b}`)
            }
            return Bool
        }
        throw new Error(`Invalid operant '${node.op}' for logical expression`)
    }
    this.typeOfBlock = function(node){
        let last

        for (let expr of node.exprs){
            last = this.typecheck(expr)
        }
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
}

export { TypeChecker }