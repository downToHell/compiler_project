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
        const pushBack = (i) => ins.push(i)

        switch (node.constructor){
            case ast.Literal: return this.visitLiteral(node, pushBack)
            case ast.Identifier: return var_table.getSymbol(node.name)
            case ast.BinaryExpr: return this.visitLeftRightExpr(node, pushBack)
            case ast.LogicalExpr: return this.visitLeftRightExpr(node, pushBack)
            case ast.IfExpr: return this.visitIfExpr(node, pushBack)
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
    this.visitLiteral = function(node, callback){
        const _var = newVar()
        callback(new ir.LoadIntConst(node.value, _var))
        return _var
    }
    this.visitLeftRightExpr = function(node, callback){
        const dest = newVar()
        callback(new ir.Call(node.op, [
            visit(node.left),
            visit(node.right)
        ], dest))
        return dest
    }
    this.visitIfExpr = function(node, callback){
        const _then = newLabel()
        let _else

        if (node.elsz) _else = newLabel()
        const _end = newLabel()

        const var_cond = visit(node.cond)
        callback(new ir.CondJump(var_cond, _then, _else))

        callback(_then)
        const then_res = visit(node.body)
        callback(new ir.Jump(_end))
        
        if (node.elsz){
            callback(_else)
            const else_res = visit(node.elsz)
            callback(new ir.Copy(else_res, then_res))
        }
        callback(_end)
        return then_res
    }
}

export { IRGenerator }