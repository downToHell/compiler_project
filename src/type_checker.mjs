import * as ast from './ast.mjs'
import * as type from './types.mjs'
import { SymTab } from './symtab.mjs'
import { TokenType } from './tokenizer.mjs'

const { Int, Bool, Unit, BasicType, PtrType, FunType, ModuleType } = type

const ARITHMETIC_OPS = [TokenType.PLUS, TokenType.MINUS, TokenType.STAR, TokenType.DIV, TokenType.MOD, TokenType.POW]
const EQUALITY_OPS = [TokenType.EQ_EQ, TokenType.NE]
const LOGICAL_OPS = [TokenType.AND, TokenType.OR]
const COMPARISON_OPS = [TokenType.LT, TokenType.LE, TokenType.GT, TokenType.GE]

function TCContext(_env){
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

    const toType = (a) => {
        const baseType = new BasicType(a.ident.name)
        return a.refDepth === 0 ? baseType : new PtrType(baseType, a.refDepth)
    }

    this.getSymbol = (sym) => env.getSymbol(sym)
    this.addSymbol = (sym, value) => env.addSymbol(sym, value)
    this.beginScope = () => env = new SymTab(env)
    this.endScope = () => env = env.getParent()

    this.newFunction = (node) => {
        const args = node.args.map(arg => toType(arg.type))
        const fun = new FunType(args, toType(node.retType))
        this.addSymbol(node.ident.name, fun)
        funStack.push(node)
        return fun
    }
    this.currentFunction = () => funStack.at(-1)

    this.finalizeModule = (callback) => {
        funStack.forEach(fun => {
            this.beginScope()
            fun.args.forEach(a => this.addSymbol(a.expr.name, toType(a.type)))
            callback(fun.body)
            this.endScope()
            funStack.pop()
        })
    }
}

function TypeChecker(_env){
    const ctx = new TCContext(_env)
    
    const makeCall = (op, args, loc) => {
        return new ast.Call(new ast.Identifier(op, loc.copy()), args, loc.copy())
    }
    const assignType = (node, type) => {
        node.__type__ = type
        return node
    }

    this.typecheck = function(node){
        switch(node.constructor){
            case ast.Literal: return this.typeOfLiteral(node)
            case ast.Identifier: return assignType(node, ctx.getSymbol(node.name))
            case ast.BinaryExpr: return this.typeOfBinaryExpr(node)
            case ast.LogicalExpr: return this.typeOfBinaryExpr(node)
            case ast.UnaryExpr: return this.typeOfUnaryExpr(node)
            case ast.Call: return this.typeOfCall(node)
            case ast.Block: return this.typeOfBlock(node)
            case ast.IfExpr: return this.typeOfIfExpr(node)
            case ast.WhileExpr: return this.typeOfWhileExpr(node)
            case ast.Break:
            case ast.Continue:
                return assignType(node, Unit)
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
            return assignType(node, Int)
        } else if (typeof node.value === 'boolean'){
            return assignType(node, Bool)
        } else if (node.value === null){
            return assignType(node, Unit)
        }
        throw new Error(`${node.loc}: Unknown literal type: ${node.value}`)
    }
    this.typeOfBinaryExpr = function(node){
        return this.typeOfCall(makeCall(node.op, [node.left, node.right], node.loc))
    }
    this.typeOfUnaryExpr = function(node){
        return this.typeOfCall(makeCall(ast.encodeOp(node.op), [node.right], node.loc))
    }
    this.typeOfCall = function(node){
        const fun = ctx.getSymbol(node.target.name)
        const args = node.args.map(f => this.typecheck(f).__type__)

        if (!fun.accept(...args)){
            throw new Error(`${node.loc}: Function '${node.target.name}' expected ${fun.argStr()}, got (${args.join(', ')})`)
        }
        return assignType(node, typeof fun.ret === 'function' ? fun.ret(...args) : fun.ret)
    }
    this.typeOfBlock = function(node){
        ctx.beginScope()
        let last = Unit

        for (let expr of node.exprs){
            last = this.typecheck(expr).__type__
        }
        ctx.endScope()
        return assignType(node, last)
    }
    this.typeOfIfExpr = function(node){
        const a = this.typecheck(node.cond).__type__

        if (a !== Bool){
            throw new Error(`${node.loc}: Condition of if-clause must be a Bool, got ${a} instead`)
        } else if (typeof node.elsz === 'undefined'){
            return assignType(node, Unit)
        }
        const b = this.typecheck(node.body).__type__
        const c = this.typecheck(node.elsz).__type__

        if (b !== c){
            throw new Error(`${node.loc}: Types of then-clause and else-clause must match`)
        }
        return assignType(node, b)
    }
    this.typeOfWhileExpr = function(node){
        const a = this.typecheck(node.cond).__type__

        if (a !== Bool){
            throw new Error(`${node.loc}: Condition of when expression must be a Bool, got ${a} instead`)
        }
        this.typecheck(node.body)
        return assignType(node, Unit)
    }
    this.typeOfFunDeclaration = function(node){
        const fun = ctx.newFunction(node)
        return assignType(node, fun)
    }
    this.typeOfReturnExpr = function(node){
        const fun = ctx.currentFunction()
        const val = this.typecheck(node.value).__type__

        if (!val.is(fun.retType)){
            throw new Error(`${node.loc}: Invalid return type ${val}, expected ${fun.retType} instead`)
        }
        return assignType(node, Unit)
    }
    this.typeOfVarDeclaration = function(node){
        const type = this.typecheck(node.initializer).__type__
        ctx.addSymbol(node.ident.name, type)
        return assignType(node, type)
    }
    this.typeOfAssignment = function(node){
        const type = this.typecheck(node.expr).__type__
        const res = this.typecheck(node.target).__type__

        if (!res.is(type)){
            throw new Error(`${node.loc}: Reassignment of ${node.target} with type '${type}' is not allowed`)
        }
        return assignType(node, type)
    }
    this.typeOfTypeExpr = function(node){
        const type = this.typecheck(node.expr).__type__

        if (!type.is(node.type)){
            throw new Error(`${node.loc}: Invalid type expression: expected ${node.type}, got ${type}`)
        }
        return assignType(node, type)
    }
    this.typeOfModule = function(node){
        node.exprs = node.exprs.map(n => this.typecheck(n))
        ctx.finalizeModule(this.typecheck.bind(this))
        return assignType(node, new ModuleType(node))
    }
}

export { TypeChecker }