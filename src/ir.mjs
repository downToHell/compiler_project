export function IRVar(name){
    this.name = name
    this.toString = () => this.name
}

export function Instruction(){
    this.fields = () => {
        return Object.keys(this)
            .filter(k => this[k] !== undefined && typeof this[k] !== 'function')
    }
    this.toString = () => {
        const formatValue = (v) => {
            if (Array.isArray(v)){
                return `[${v.map(i => formatValue(i)).join(', ')}]`
            }
            return v.toString()
        }
        return `${this.constructor.name}(${this.fields().map(f => formatValue(this[f])).join(', ')})`
    }
}

export function LoadBoolConst(value, dest){
    Instruction.call(this)
    this.value = value
    this.dest = dest
}

export function LoadIntConst(value, dest){
    Instruction.call(this)
    this.value = value
    this.dest = dest
}

export function Copy(source, dest, refDepth){
    Instruction.call(this)
    this.source = source
    this.dest = dest
    this.refDepth = refDepth || 0
}

export function Call(fun, args, dest){
    Instruction.call(this)
    this.fun = fun
    this.args = args
    this.dest = dest
}

export function Jump(label){
    Instruction.call(this)
    this.label = label
}

export function CondJump(cond, then, elsz){
    Instruction.call(this)
    this.cond = cond
    this.then = then
    this.elsz = elsz
}

export function Label(name){
    Instruction.call(this)
    this.name = name
}

export function Return(value){
    Instruction.call(this)
    this.value = value
}