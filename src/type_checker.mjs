import { Bool, Int, Unit } from './types.mjs'
import { BinaryExpr, IfExpr, Literal, LogicalExpr, WhileExpr } from './ast.mjs'

function TypeChecker(){

    this.typecheck = function(node){
        switch(node.constructor){
            case Literal: return this.typeOfLiteral(node)
            case BinaryExpr: return this.typeOfBinaryExpr(node)
            case LogicalExpr: return this.typeOfLogicalExpr(node)
            case IfExpr: return this.typeOfIfExpr(node)
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

        if (['+', '-', '*', '/', '%', '**'].includes(node.op)){
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

        if (['<', '<=', '>', '>='].includes(node.op)){
            if (!(a === Int && b === Int)){
                throw new Error(`Operand '${node.op}' expected to Ints, got ${a} and ${b}`)
            }
            return Bool
        } else if (['==', '!=']){
            if (a === Int && b === Int){
                return Bool
            } else if (a === Bool && b === Bool){
                return Bool
            }
            throw new Error(`Operand '${node.op}' expected two matching types, got ${a} and ${b}`)
        }
        throw new Error(`Invalid operant '${node.op}' for logical expression`)
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
}

export { TypeChecker }