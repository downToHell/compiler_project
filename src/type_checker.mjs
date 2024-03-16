import * as ast from './ast.mjs'
import * as type from './types.mjs'
import { SymTab } from './symtab.mjs'
import { TokenType } from './tokenizer.mjs'

const { Int, Bool, Unit, BasicType, PtrType, FunType } = type

const ARITHMETIC_OPS = [TokenType.PLUS, TokenType.MINUS, TokenType.STAR, TokenType.DIV, TokenType.MOD, TokenType.POW]
const EQUALITY_OPS = [TokenType.EQ_EQ, TokenType.NE]
const LOGICAL_OPS = [TokenType.AND, TokenType.OR]
const COMPARISON_OPS = [TokenType.LT, TokenType.LE, TokenType.GT, TokenType.GE]

function TypeChecker(_env){
    let env = _env || new SymTab()
    env.addIfAbsent(ARITHMETIC_OPS, type.ArithmeticOp)
    env.addIfAbsent(EQUALITY_OPS, type.EqualityOp)
    env.addIfAbsent(LOGICAL_OPS, type.LogicalOp)
    env.addIfAbsent(COMPARISON_OPS, type.ComparisonOp)
    env.addIfAbsent('print_int', type.PrintIntFn)
    env.addIfAbsent('print_bool', type.PrintBoolFn)
    env.addIfAbsent('read_int', type.ReadIntFn)
    env.addIfAbsent(TokenType.AMP, type.AddressOfOp)
    env.addIfAbsent(TokenType.UNARY_STAR, type.DereferenceOp)
    env.addIfAbsent(TokenType.UNARY_MINUS, type.ArithmeticNegation)
    env.addIfAbsent(TokenType.NOT, type.LogicalNegation)

    const funStack = []

    const toType = (f) => {
        return f.refDepth === 0 ? new BasicType(f.ident.name) : new PtrType(f.ident.name, f.refDepth)
    }

    this.typecheck = function(node){
        switch(node.constructor){
            case ast.Literal: return this.typeOfLiteral(node)
            case ast.Identifier: return env.getSymbol(node.name)
            case ast.BinaryExpr: return this.typeOfBinaryExpr(node)
            case ast.LogicalExpr: return this.typeOfBinaryExpr(node)
            case ast.UnaryExpr: return this.typeOfUnaryExpr(node)
            case ast.Call: return this.typeOfCall(node)
            case ast.Block: return this.typeOfBlock(node)
            case ast.IfExpr: return this.typeOfIfExpr(node)
            case ast.WhileExpr: return this.typeOfWhileExpr(node)
            case ast.Break:
            case ast.Continue:
                return Unit
            case ast.Assignment: return this.typeOfAssignment(node)
            case ast.FunDecl: return this.typeOfFunDeclaration(node)
            case ast.Return: return this.typeOfReturnExpr(node)
            case ast.VarDecl: return this.typeOfVarDeclaration(node)
            case ast.TypeExpr: return this.typeOfTypeExpr(node)
            case ast.Grouping: return this.typecheck(node.expr)
            case ast.Module: return this.typeOfModule(node)
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
        throw new Error(`${node.loc}: Unknown literal type: ${node.value}`)
    }
    this.typeOfBinaryExpr = function(node){
        return this.typeOfCall({ target: { name: node.op }, args: [node.left, node.right], loc: node.loc })
    }
    this.typeOfUnaryExpr = function(node){
        return this.typeOfCall({ target: { name: ast.encodeOp(node.op) }, args: [node.right], loc: node.loc })
    }
    this.typeOfCall = function(node){
        const fun = env.getSymbol(node.target.name)
        const args = node.args.map(f => this.typecheck(f))

        if (!fun.accept(...args)){
            throw new Error(`${node.loc}: Function '${node.target.name}' expected ${fun.argStr()}, got (${args.join(', ')})`)
        }
        return typeof fun.ret === 'function' ? fun.ret(...args) : fun.ret
    }
    this.typeOfBlock = function(node){
        env = new SymTab(env)
        let last = Unit

        for (let expr of node.exprs){
            last = this.typecheck(expr)
        }
        env = env.getParent()
        return last
    }
    this.typeOfIfExpr = function(node){
        const a = this.typecheck(node.cond)

        if (a !== Bool){
            throw new Error(`${node.loc}: Condition of if-clause must be a Bool, got ${a} instead`)
        } else if (typeof node.elsz === 'undefined'){
            return Unit
        }
        const b = this.typecheck(node.body)
        const c = this.typecheck(node.elsz)

        if (b !== c){
            throw new Error(`${node.loc}: Types of then-clause and else-clause must match`)
        }
        return b
    }
    this.typeOfWhileExpr = function(node){
        const a = this.typecheck(node.cond)

        if (a !== Bool){
            throw new Error(`${node.loc}: Condition of when expression must be a Bool, got ${a} instead`)
        }
        this.typecheck(node.body)
        return Unit
    }
    this.typeOfFunDeclaration = function(node){
        const args = node.args.map(f => toType(f.type))
        const fun = new FunType(args, toType(node.retType))
        env.addSymbol(node.ident.name, fun)
        funStack.push(node)
        return fun
    }
    this.typeOfReturnExpr = function(node){
        const fun = funStack.at(-1)
        const val = this.typecheck(node.value)

        if (!val.is(fun.retType)){
            throw new Error(`${node.loc}: Invalid return type ${val}, expected ${fun.retType} instead`)
        }
        return Unit
    }
    this.typeOfVarDeclaration = function(node){
        const type = this.typecheck(node.initializer)
        env.addSymbol(node.ident.name, type)
        return type
    }
    this.typeOfAssignment = function(node){
        const type = this.typecheck(node.expr)
        const res = this.typecheck(node.target)

        if (!res.is(type)){
            throw new Error(`${node.loc}: Reassignment of ${node.target} with type '${type}' is not allowed`)
        }
        return type
    }
    this.typeOfTypeExpr = function(node){
        const type = this.typecheck(node.expr)

        // TODO: only works for BasicTypes! Implement FunType?
        if (!type.is(node.type)){
            throw new Error(`${node.loc}: Invalid type expression: expected ${node.type}, got ${type}`)
        }
        return type
    }
    this.typeOfModule = function(node){
        const res = node.exprs.map(n => this.typecheck(n))

        funStack.forEach(fun => {
            env = new SymTab(env)
            fun.args.forEach(f => env.addSymbol(f.expr.name, toType(f.type)))
            this.typecheck(fun.body)
            env = env.getParent()
            funStack.pop()
        })
        return res
    }
}

export { TypeChecker }