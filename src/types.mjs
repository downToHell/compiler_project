function Type(){
    this.is = (other) => {
        if (typeof other === 'object'){
            return this.is(other.toString())
        } else if (typeof other === 'string'){
            return this.toString() === other
        }
        return false
    }
    this.isNot = (other) => !this.is(other)
    this.toString = () => `<anonymous type>`
}

function ModuleType(base){
    this.first = () => base.first()
    this.each = (callback) => base.each(callback)
    this.toString = () => `${base}`
}

function BasicType(name){
    Type.call(this)
    this.name = name
    this.toString = () => name
}

BasicType.prototype = Object.create(Type.prototype)
BasicType.prototype.constructor = BasicType

function PtrType(base, refDepth){
    Type.call(this)
    this.base = base
    this.refDepth = refDepth

    this.addressOf = () => new PtrType(base, refDepth+1)
    this.dereference = () => {
        if (refDepth - 1 > 0){
            return new PtrType(base, refDepth-1)
        }
        return base
    }
    this.toString = () => `${base instanceof FunType ? `(${base})`: base}${'*'.repeat(refDepth)}`
}

PtrType.prototype = Object.create(Type.prototype)
PtrType.prototype.constructor = PtrType

function FunType(args, ret){
    Type.call(this)
    this.args = args
    this.ret = ret

    this.accept = (...values) => {
        if (values.length != args.length){
            return false
        }

        for (let i = 0; i < values.length; i++){
            if (args[i].isNot(values[i])){
                return false
            }
        }
        return true
    }
    this.argStr = () => `(${args.join(', ')})`
    this.toString = () => `${this.argStr()} => ${ret}`
}

FunType.prototype = Object.create(Type.prototype)
FunType.prototype.constructor = FunType

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

OverloadedFunType.prototype = Object.create(FunType.prototype)
OverloadedFunType.prototype.constructor = OverloadedFunType

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

GenericFunType.prototype = Object.create(FunType.prototype)
GenericFunType.prototype.constructor = GenericFunType

export const Int = new BasicType('Int')
export const Bool = new BasicType('Bool')
export const Unit = new BasicType('Unit')

export const AddressOfOp = new GenericFunType([Type], PtrType, (args) => {
    return args[0] instanceof PtrType ? args[0].addressOf() : new PtrType(args[0], 1)
})
export const ArithmeticOp = new FunType([Int, Int], Int)
export const ArithmeticNegation = new FunType([Int], Int)
export const ComparisonOp = new FunType([Int, Int], Bool)
export const DereferenceOp = new GenericFunType([PtrType], Type, (args) => args[0].dereference())
export const LogicalOp = new FunType([Bool, Bool], Bool)
export const LogicalNegation = new FunType([Bool], Bool)
export const EqualityOp = new OverloadedFunType([[Int, Int], [Bool, Bool], [Unit, Unit]], Bool)
export const PrintIntFn = new FunType([Int], Unit)
export const PrintBoolFn = new FunType([Bool], Unit)
export const ReadIntFn = new FunType([], Int)
export const ClearFn = new FunType([], Unit)
export const ExitFn = new FunType([], Unit)

export { BasicType, FunType, PtrType, ModuleType }