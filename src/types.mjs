function BasicType(name){
    this.name = name
    this.refDepth = 0
    this.is = (other) => {
        if (typeof other === 'object'){
            return this.is(other.toString())
        } else if (typeof other === 'string'){
            return this.name === other
        }
        return false
    }
    this.toString = () => this.name
}

function PtrType(name, refDepth){
    this.name = name
    this.refDepth = refDepth

    this.addressOf = () => new PtrType(name, refDepth+1)
    this.dereference = () => {
        if (refDepth - 1 < 0){
            throw new Error(`Can't dereference type ${name}`)
        }
        return new PtrType(name, refDepth-1)
    }
    this.is = (other) => {
        if (typeof other === 'object'){
            return this.is(other.toString())
        } else if (typeof other === 'string'){
            return this.toString() === other
        }
        return false
    }
    this.toString = () => `${this.name}${'*'.repeat(refDepth)}`
}

PtrType.prototype = Object.create(BasicType.prototype)
PtrType.prototype.constructor = PtrType

function FunType(args, ret){
    this.args = args
    this.ret = ret

    this.accept = (...values) => {
        if (values.length != args.length){
            return false
        }

        for (let i = 0; i < values.length; i++){
            if (!args[i].is(values[i])){
                return false
            }
        }
        return true
    }
    this.argStr = () => `(${args.join(', ')})`
    this.toString = () => `${this.argStr()} => ${ret}`
}

function OverloadedFunType(args, ret){
    const init = (args) => {
        if (!Array.isArray(args) || !Array.isArray(args[0])){
            throw new Error('Not an overloaded function type! Use FunType instead')
        }
        let arity = args[0].length
        const res = [new FunType(args[0], ret)]

        for (let i = 1; i < args.length; i++){
            if (arity != args[i].length){
                throw new Error(`Overloaded function types must all have the same arity: ${arity}`)
            }
            res.push(new FunType(args[i], ret))
        }
        return res
    }
    this.args = init(args)
    this.ret = ret
    
    this.accept = (...values) => {
        for (const overloadedFun of this.args){
            if (overloadedFun.accept(...values)){
                return true
            }
        }
        return false
    }
    this.argStr = () => `${this.args.map(a => a.argStr()).join(' or ')}`
    this.toString = () => `${this.argStr()} => ${ret}`
}

function GenericFunType(genericArgs, genericRet, mapper){
    this.genericArgs = genericArgs
    this.genericRet = genericRet
    this.ret = (...values) => mapper(values)

    this.accept = (...values) => {
        if (values.length !== genericArgs.length){
            return false
        }

        for (let i = 0; i < values.length; i++){
            if (!(values[i] instanceof genericArgs[i])){
                return false
            }
        }
        return true
    }
    this.argStr = () => `(${this.genericArgs.map(a => typeof a === 'function' ? a.name : a.toString()).join(', ')})`
    this.toString = () => `${this.argStr()} => ${typeof genericRet === 'function' ? genericRet.name : genericRet.toString()}`
}

export const Int = new BasicType('Int')
export const Bool = new BasicType('Bool')
export const Unit = new BasicType('Unit')

export const AddressOfOp = new GenericFunType([BasicType], PtrType, (args) => {
    const arg = args[0]
    if (arg instanceof PtrType) return arg.addressOf()
    return new PtrType(arg.name, 1)
})
export const ArithmeticOp = new FunType([Int, Int], Int)
export const ArithmeticNegation = new FunType([Int], Int)
export const ComparisonOp = new FunType([Int, Int], Bool)
export const DereferenceOp = new GenericFunType([PtrType], BasicType, (args) => {
    const arg = args[0]
    if (arg.constructor === BasicType) throw new Error(`Can't dereference type ${arg.name}`)
    return arg.dereference()
})
export const LogicalOp = new FunType([Bool, Bool], Bool)
export const LogicalNegation = new FunType([Bool], Bool)
export const EqualityOp = new OverloadedFunType([[Int, Int], [Bool, Bool], [Unit, Unit]], Bool)
export const PrintIntFn = new FunType([Int], Unit)
export const PrintBoolFn = new FunType([Bool], Unit)
export const ReadIntFn = new FunType([], Int)
export const ClearFn = new FunType([], Unit)
export const ExitFn = new FunType([], Unit)

export { BasicType, FunType, PtrType }