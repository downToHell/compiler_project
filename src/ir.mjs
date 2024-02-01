export function IRVar(name){
    this.name = name
    this.toString = () => this.name
}

export function Instruction(){
    this.toString = () => {
        const format_value = (v) => {
            if (Array.isArray(v)){
                return `[${v.map(i => format_value(i)).join(', ')}]`
            }
            return v.toString()
        }

        let props = []

        for (const k in this){
            if (this[k] === undefined || typeof this[k] === 'function'){
                continue
            }
            props.push(format_value(this[k]))
        }
        return `${this.constructor.name}(${props.join(', ')})`
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

export function Copy(source, dest){
    Instruction.call(this)
    this.source = source
    this.dest = dest
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