export function Literal(value){
    this.value = value
}

export function Identifier(name){
    this.name = name
}

export function BinaryExpr(left, op, right){
    this.left = left
    this.op = op
    this.right = right
}

export function LogicalExpr(left, op, right){
    this.left = left
    this.op = op
    this.right = right
}

export function UnaryExpr(right, op){
    this.right = right
    this.op = op
}

export function Grouping(expr){
    this.expr = expr
}

export function Assignment(target, expr){
    this.target = target
    this.expr = expr
}

export function IfExpr(cond, body, elsz){
    this.cond = cond
    this.body = body
    this.elsz = elsz
}

export function Call(target, args){
    this.target = target
    this.args = args
}