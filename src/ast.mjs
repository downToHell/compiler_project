export function Expression(loc){
    this.loc = loc
}

export function Literal(value, loc){
    Expression.call(this, loc)
    this.value = value
}

export function Identifier(name, loc){
    Expression.call(this, loc)
    this.name = name
}

export function BinaryExpr(left, op, right, loc){
    Expression.call(this, loc)
    this.left = left
    this.op = op
    this.right = right
}

export function LogicalExpr(left, op, right, loc){
    Expression.call(this, loc)
    this.left = left
    this.op = op
    this.right = right
}

export function UnaryExpr(right, op, loc){
    Expression.call(this, loc)
    this.right = right
    this.op = op
}

export function Grouping(expr, loc){
    Expression.call(this, loc)
    this.expr = expr
}

export function Assignment(target, expr, loc){
    Expression.call(this, loc)
    this.target = target
    this.expr = expr
}

export function IfExpr(cond, body, elsz, loc){
    Expression.call(this, loc)
    this.cond = cond
    this.body = body
    this.elsz = elsz
}

export function WhileExpr(cond, body, loc){
    Expression.call(this, loc)
    this.cond = cond
    this.body = body
}

export function Call(target, args, loc){
    Expression.call(this, loc)
    this.target = target
    this.args = args
}

export function Declaration(ident, initializer, loc){
    Expression.call(this, loc)
    this.ident = ident
    this.initializer = initializer
}

export function Block(exprs, loc){
    Expression.call(this, loc)
    this.exprs = exprs
}

export function TypeExpr(type, expr, loc){
    Expression.call(this, loc)
    this.type = type
    this.expr = expr
}