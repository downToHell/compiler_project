import * as ast from './ast.mjs'
import * as ir from './ir.mjs'
import { SymTab } from './symtab.mjs'

function IRGenerator(){
    let next_var = 1
    let next_label = 1

    const var_table = new SymTab()
    const ins = []

    const newVar = () => {
        const var_name = `x${next_var++}` 
        const _var = new ir.IRVar(var_name)
        var_table.addSymbol(var_name, _var)
        return _var
    }
    const newLabel = () => new ir.Label(`L${next_label++}`)

    const visit = (node) => {
        const emit = (i) => ins.push(i)

        switch (node.constructor){
            case ast.Literal: return this.visitLiteral(node, emit)
            case ast.Identifier: return var_table.getSymbol(node.name)
            case ast.BinaryExpr: return this.visitLeftRightExpr(node, emit)
            case ast.LogicalExpr: return this.visitLeftRightExpr(node, emit)
            case ast.IfExpr: return this.visitIfExpr(node, emit)
            case ast.WhileExpr: return this.visitWhileExpr(node, emit)
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
    this.visitLiteral = function(node, emit){
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
    this.visitLeftRightExpr = function(node, emit){
        const dest = newVar()
        emit(new ir.Call(node.op, [
            visit(node.left),
            visit(node.right)
        ], dest))
        return dest
    }
    this.visitIfExpr = function(node, emit){
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
    this.visitWhileExpr = function(node, emit){
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
}

export { IRGenerator }