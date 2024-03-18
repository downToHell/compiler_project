import { EOL } from 'os'
import { TokenType } from './tokenizer.mjs'

export function Expression(loc){
    this.loc = loc
}

export function Literal(value, loc){
    Expression.call(this, loc)
    this.value = value
    this.toString = () => `${value}`
}

export function Identifier(name, loc){
    Expression.call(this, loc)
    this.name = name
    this.toString = () => name
}

export function BinaryExpr(left, op, right, loc){
    Expression.call(this, loc)
    this.left = left
    this.op = op
    this.right = right
    this.toString = () => `${left} ${op} ${right}`
}

export function LogicalExpr(left, op, right, loc){
    Expression.call(this, loc)
    this.left = left
    this.op = op
    this.right = right
    this.toString = () => `${left} ${op} ${right}`
}

export function UnaryExpr(right, op, loc){
    Expression.call(this, loc)
    this.right = right
    this.op = op
    this.toString = () => `${op}${op === 'not' ? ' ' : ''}${right}`
}

export function Grouping(expr, loc){
    Expression.call(this, loc)
    this.expr = expr
    this.toString = () => `(${expr})`
}

export function Assignment(target, expr, loc){
    Expression.call(this, loc)
    this.target = target
    this.expr = expr
    this.toString = () => `${target} = ${expr}`
}

export function IfExpr(cond, body, elsz, loc){
    Expression.call(this, loc)
    this.cond = cond
    this.body = body
    this.elsz = elsz
    this.toString = () => `if ${cond} then ${body}${elsz !== undefined ? ` else ${elsz}` : ''}`
}

export function WhileExpr(cond, body, loc){
    Expression.call(this, loc)
    this.cond = cond
    this.body = body
    this.toString = () => `while ${cond} do ${body}`
}

export function Break(loc){
    Expression.call(this, loc)
    this.toString = () => 'break'
}

export function Continue(loc){
    Expression.call(this, loc)
    this.toString = () => 'continue'
}

export function Call(target, args, loc){
    Expression.call(this, loc)
    this.target = target
    this.args = args
    this.toString = () => `${target}(${args.join(', ')})`
}

export function FunDecl(ident, args, retType, body, loc){
    Expression.call(this, loc)
    this.ident = ident
    this.args = args
    this.retType = retType
    this.body = body
    this.toString = () => `fun ${ident}(${args.join(', ')}): ${retType} ${body}`
}

export function Return(value, loc){
    Expression.call(this, loc)
    this.value = value
    this.toString = () => `return ${value}`
}

export function VarDecl(ident, initializer, loc){
    Expression.call(this, loc)
    this.ident = ident
    this.initializer = initializer
    this.toString = () => `var ${ident} = ${initializer}`
}

export function Block(exprs, loc){
    Expression.call(this, loc)
    this.exprs = exprs
    this.toString = () => `{${exprs.join('; ')}}`
}

export function FunType(args, retType, loc){
    Expression.call(this, loc)
    this.args = args
    this.retType = retType
    this.toString = () => `((${args.join(', ')}) => ${retType})`
}

export function TypeId(ident, refDepth, loc){
    Expression.call(this, loc)
    this.ident = ident
    this.refDepth = refDepth
    this.toString = () => `${ident}${'*'.repeat(refDepth)}`
}

export function TypeExpr(type, expr, loc){
    Expression.call(this, loc)
    this.type = type
    this.expr = expr
    this.toString = () => `${expr}: ${type}`
}

export function Module(exprs, loc){
    Expression.call(this, loc)
    this.exprs = exprs
    
    this.first = () => {
        if (this.exprs.length == 0){
            throw new Error('No such element')
        }
        return exprs[0]
    }
    this.each = (callback) => callback(exprs)
    this.toString = () => `${exprs.join(EOL)}`
}

const encodeOp = (op) => {
    const encoded = {
        '-': TokenType.UNARY_MINUS,
        '*': TokenType.UNARY_STAR
    }
    return encoded[op] ? encoded[op] : op
}
const makeCall = (op, args, loc) => {
    return new Call(new Identifier(op, loc.copy()), args, loc.copy())
}

export { encodeOp, makeCall }