import * as ast from './ast.mjs'
import * as ir from './ir.mjs'
import { SymTab } from './symtab.mjs'
import { TokenType } from './tokenizer.mjs'

function IRGenerator(){
    let next_var = 1
    let next_label = 1

    const var_table = new SymTab()
    const var_unit = new ir.IRVar('unit')
    var_table.addSymbol('unit', var_unit)

    const ins = []

    const emit = (i) => ins.push(i)
    const newVar = () => {
        const var_name = `x${next_var++}` 
        const _var = new ir.IRVar(var_name)
        var_table.addSymbol(var_name, _var)
        return _var
    }
    const newLabel = () => new ir.Label(`L${next_label++}`)

    const visit = (node) => {
        switch (node.constructor){
            case ast.Literal: return this.visitLiteral(node)
            case ast.Identifier: return var_table.getSymbol(node.name)
            case ast.BinaryExpr: return this.visitBinaryExpr(node)
            case ast.LogicalExpr: return this.visitLogicalExpr(node)
            case ast.IfExpr: return this.visitIfExpr(node)
            case ast.WhileExpr: return this.visitWhileExpr(node)
            case ast.Block: return this.visitBlock(node)
            case ast.TypeExpr:
            case ast.Grouping: return visit(node.expr)
            case ast.Declaration: return this.visitDeclaration(node)
            case ast.Assignment: return this.visitAssignment(node)
            case ast.Call: return this.visitCall(node)
            default: {
                throw new Error(`Unknown ast node: ${node.constructor.name}`)
            }
        }
    }

    this.generate = function(node){
        // clear from previous call
        ins.length = 0
        var_table.clear()
        next_label = 1
        next_var = 1

        visit(node)
        return ins
    }
    this.visitLiteral = function(node){
        if (node.value === null){
            return var_unit
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
    this.visitIfExpr = function(node){
        const _then = newLabel()
        let _else

        if (node.elsz) _else = newLabel()
        const _end = newLabel()

        const var_cond = visit(node.cond)
        emit(new ir.CondJump(var_cond, _then, _else))

        emit(_then)
        const then_res = visit(node.body)
        emit(new ir.Jump(_end))
        
        if (node.elsz){
            emit(_else)
            const else_res = visit(node.elsz)
            emit(new ir.Copy(else_res, then_res))
        }
        emit(_end)
        return then_res
    }
    this.visitWhileExpr = function(node){
        const begin = newLabel()
        const body = newLabel()
        const end = newLabel()

        emit(begin)
        const var_cond = visit(node.cond)
        emit(new ir.CondJump(var_cond, body, end))

        emit(body)
        const body_res = visit(node.body)
        emit(new ir.Jump(begin))

        emit(end)
        return body_res
    }
    this.visitBlock = function(node){
        let last

        for (const k of node.exprs){
            last = visit(k)
        }
        return last
    }
    this.visitDeclaration = function(node){
        const _var = visit(node.initializer)
        var_table.addSymbol(node.ident.name, _var)
        return _var
    }
    this.visitAssignment = function(node){
        const _var = var_table.getSymbol(node.target.name)
        emit(new ir.Copy(visit(node.expr), _var))
        return _var
    }
    this.visitCall = function(node){
        const _var = newVar()
        emit(new ir.Call(node.target.name, node.args.map(a => visit(a)), _var))
        return _var
    }
}

export { IRGenerator }