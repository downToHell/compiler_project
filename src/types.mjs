function BasicType(name){
    this.name = name
    this.toString = () => this.name
}

function FunType(args, ret){
    this.args = args
    this.ret = ret

    this.accept = (...values) => {
        if (values.length != args.length){
            return false
        }

        for (let i = 0; i < values.length; i++){
            if (args[i] !== values[i]){
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

export const Int = new BasicType('Int')
export const Bool = new BasicType('Bool')
export const Unit = new BasicType('Unit')
export const BasicTypes = { Int, Bool, Unit }

export const ArithmeticOp = new FunType([Int, Int], Int)
export const ArithmeticNegation = new FunType([Int], Int)
export const ComparisonOp = new FunType([Int, Int], Bool)
export const LogicalOp = new FunType([Bool, Bool], Bool)
export const LogicalNegation = new FunType([Bool], Bool)
export const EqualityOp = new OverloadedFunType([[Int, Int], [Bool, Bool]], Bool)
export const PrintIntFn = new FunType([Int], Unit)
export const PrintBoolFn = new FunType([Bool], Unit)
export const ReadIntFn = new FunType([], Int)
export const ClearFn = new FunType([], Unit)
export const ExitFn = new FunType([], Unit)

export { FunType }