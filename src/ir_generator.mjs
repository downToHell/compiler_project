import * as ast from './ast.mjs'
import * as ir from './ir.mjs'
import { SymTab } from './symtab.mjs'
import { TokenType } from './tokenizer.mjs'

const JMP_TARGET_END = 'end'
const JMP_TARGET_BEGIN = 'begin'

function IRContext(_env){
    let env = _env || new SymTab()
    const varUnit = new ir.IRVar('unit')
    env.addIfAbsent('unit', varUnit)

    let data = {}
    let funStack = []
    let loopStack = []
    let nextVar = 1
    let nextLabel = 1

    this.getSymbol = (sym) => env.getSymbol(sym)
    this.addSymbol = (sym, value) => env.addSymbol(sym, value)
    this.newVar = (name) => {
        const _var =  new ir.IRVar(name ? name : `x${nextVar++}`)
        env.addSymbol(_var.name, _var)
        return _var
    }
    this.newLabel = (name) => new ir.Label(name ? name : `L${nextLabel++}`)

    this.beginFunction = (node) => {
        this.beginScope()
        const args = node.args.map(a => {
            const _var = this.newVar()
            this.addSymbol(a.expr.name, _var)
            return _var
        })
        data[node.ident.name] = { args, ins: [] }
        funStack.push(node.ident.name)
        this.emit(this.newLabel(node.ident.name))
    }
    this.endFunction = () => {
        this.endScope()
        funStack.pop()
    }
    this.beginScope = () => env = new SymTab(env)
    this.endScope = () => env = env.getParent()

    this.resolve = (target, refDepth) => {
        refDepth = refDepth || 0

        if (target instanceof ast.Identifier){
            return {
                _var: this.getSymbol(target.name),
                refDepth
            }
        } else if (target instanceof ast.UnaryExpr){
            return this.resolve(target.right, refDepth+1)
        }
        throw new Error(`Invalid node type: ${target}`)
    }

    this.enterLoop = (begin, end) => loopStack.push({ begin, end })
    this.exitLoop = () => loopStack.pop()
    this.currentLoop = () => loopStack.at(-1)
    
    this.emit = (ins) => {
        const func = funStack.at(-1)
        data[func].ins.push(ins)
    }
    this.emitIf = (cond, ins) => {
        if (cond) {
            this.emit(ins)
        }
    }
    this.emitIfNot = (cond, ins) => this.emitIf(!cond, ins)
    this.peek = () => {
        const func = funStack.at(-1)
        return data[func].ins.at(-1)
    }

    this.join = function(separator){
        const res = []

        for (const obj of this){
            res.push(obj.ins.join(separator))
        }
        return res.join(separator)
    }
    this.forEach = (callback) => {
        for (const val of this){
            callback(val)
        }
    }
    this[Symbol.iterator] = function *(){
        for (const k of Object.keys(data)){
            yield data[k]
        }
    }
}

function IRGenerator(_env){
    const ctx = new IRContext(_env)
    const { emit, emitIf, emitIfNot, newVar, newLabel } = ctx

    const visit = (node) => {
        switch (node.constructor){
            case ast.Literal: return this.visitLiteral(node)
            case ast.Identifier: return ctx.getSymbol(node.name)
            case ast.BinaryExpr: return this.visitBinaryExpr(node)
            case ast.LogicalExpr: return this.visitLogicalExpr(node)
            case ast.UnaryExpr: return this.visitUnaryExpr(node)
            case ast.IfExpr: return this.visitIfExpr(node)
            case ast.WhileExpr: return this.visitWhileExpr(node)
            case ast.Break: return this.visitControlFlow(JMP_TARGET_END)
            case ast.Continue: return this.visitControlFlow(JMP_TARGET_BEGIN)
            case ast.Block: return this.visitBlock(node)
            case ast.TypeExpr:
            case ast.Grouping: return visit(node.expr)
            case ast.FunDecl: return this.visitFunDeclaration(node)
            case ast.Return: return this.visitReturnExpr(node)
            case ast.VarDecl: return this.visitVarDeclaration(node)
            case ast.Assignment: return this.visitAssignment(node)
            case ast.Call: return this.visitCall(node)
            case ast.Module: return this.visitModule(node)
            default: {
                throw new Error(`Unknown ast node: ${node.constructor.name}`)
            }
        }
    }

    this.generate = function(node){
        visit(node)
        return ctx
    }
    this.visitLiteral = function(node){
        if (node.value === null){
            return ctx.getSymbol('unit')
        }
        const _var = newVar()
        
        if (typeof node.value === 'number'){
            emit(new ir.LoadIntConst(node.value, _var))
        } else if (typeof node.value === 'boolean'){
            emit(new ir.LoadBoolConst(node.value, _var))
        } else {
            throw new Error(`Invalid literal type: ${typeof node.value}`)
        }
        return _var
    }
    this.visitBinaryExpr = function(node){
        const dest = newVar()
        emit(new ir.Call(node.op, [
            visit(node.left),
            visit(node.right)
        ], dest))
        return dest
    }
    this.visitLogicalExpr = function(node){
        switch (node.op){
            case TokenType.EQ_EQ:
            case TokenType.NE:
            case TokenType.LT:
            case TokenType.LE:
            case TokenType.GT:
            case TokenType.GE:
                return this.visitBinaryExpr(node)
            case TokenType.AND: return this.visitLogicalAnd(node)
            case TokenType.OR: return this.visitLogicalOr(node)
            default: {
                throw new Error(`Invalid logical operator: ${node.op}`)
            }
        }
    }
    this.visitLogicalAnd = function(node){
        const _continue = newLabel()
        const opSkip = newLabel()
        const opEnd = newLabel()

        const resLeft = visit(node.left)
        emit(new ir.CondJump(resLeft, _continue, opSkip))

        emit(_continue)
        const res = visit(node.right)
        emit(new ir.Jump(opEnd))

        emit(opSkip)
        emit(new ir.LoadBoolConst(false, res))
        emit(opEnd)

        return res
    }
    this.visitLogicalOr = function(node){
        const _continue = newLabel()
        const opSkip = newLabel()
        const opEnd = newLabel()

        const resLeft = visit(node.left)
        emit(new ir.CondJump(resLeft, opSkip, _continue))

        emit(_continue)
        const res = visit(node.right)
        emit(new ir.Jump(opEnd))

        emit(opSkip)
        emit(new ir.LoadBoolConst(true, res))
        emit(opEnd)

        return res
    }
    this.visitUnaryExpr = function(node){
        const _var = newVar()
        const right = visit(node.right)
        emit(new ir.Call(ast.encodeOp(node.op), [right], _var))
        return _var
    }
    this.visitIfExpr = function(node){
        const _then = newLabel()
        let _else

        if (node.elsz) _else = newLabel()
        const _end = newLabel()

        const varCond = visit(node.cond)
        emit(new ir.CondJump(varCond, _then, _else || _end))

        emit(_then)
        const thenRes = visit(node.body)
        emitIfNot(ctx.peek() instanceof ir.Return, new ir.Jump(_end))
        
        if (node.elsz){
            emit(_else)
            const elseRes = visit(node.elsz)
            emitIf(thenRes && elseRes, new ir.Copy(elseRes, thenRes))
        }
        emit(_end)
        return thenRes
    }
    this.visitWhileExpr = function(node){
        const begin = newLabel()
        const body = newLabel()
        const end = newLabel()

        ctx.enterLoop(begin, end)
        emit(begin)
        const varCond = visit(node.cond)
        emit(new ir.CondJump(varCond, body, end))

        emit(body)
        const bodyRes = visit(node.body)
        emit(new ir.Jump(begin))

        emit(end)
        ctx.exitLoop()
        return bodyRes
    }
    this.visitControlFlow = function(label){
        if (!ctx.currentLoop()){
            throw new Error(`Can't ${label === 'begin' ? 'continue' : 'break'}: no currently active loop`)
        }
        const target = ctx.currentLoop()[label]
        emit(new ir.Jump(target))
        return null
    }
    this.visitBlock = function(node){
        ctx.beginScope()
        let last

        for (const k of node.exprs){
            last = visit(k)
        }
        ctx.endScope()
        return last
    }
    this.visitFunDeclaration = function(node){
        ctx.beginFunction(node)
        visit(node.body)
        ctx.endFunction()
    }
    this.visitReturnExpr = function(node){
        emit(new ir.Return(visit(node.value)))
    }
    this.visitVarDeclaration = function(node){
        const _var = newVar()
        emit(new ir.Copy(visit(node.initializer), _var))
        ctx.addSymbol(node.ident.name, _var)
        return _var
    }
    this.visitAssignment = function(node){
        const { _var, refDepth } = ctx.resolve(node.target)
        emit(new ir.Copy(visit(node.expr), _var, refDepth))
        return _var
    }
    this.visitCall = function(node){
        const _var = newVar()
        emit(new ir.Call(node.target.name, node.args.map(a => visit(a)), _var))
        return _var
    }
    this.visitModule = function(node){
        ctx.beginFunction({ args: [], ident: { name: 'main' }})
        node.exprs.forEach(n => visit(n))
        emit(new ir.Return())
        ctx.endFunction()
    }
}

export { IRGenerator }