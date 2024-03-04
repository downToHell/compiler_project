import { EOL } from 'os'
import * as ir from './ir.mjs'
import * as intr from './intrinsics.mjs'
import { isNumber } from './tokenizer.mjs'

function StackFrame(varMap){
    this.getRef = (_var) => varMap[_var]
    this.getStackUsed = () => Object.keys(varMap).length * 8
}

function Globals(){
    let frames = []
    let stackUsed = 8
    
    this.pushFrame = (variables) => {
        const varMap = {}

        for (const _var of variables){
            if (varMap[_var] === undefined){
                varMap[_var] = `-${stackUsed}(${RBP})`
                stackUsed += 8
            }
        }
        const frame = new StackFrame(varMap)
        frames.push(frame)
        return frame.getStackUsed()
    }
    this.popFrame = () => {
        const frameSpace = frames.pop().getStackUsed()
        stackUsed -= frameSpace
        return frameSpace
    }
    this.getRef = (_var) => {
        for (let i = frames.length; i > 0; i--){
            const ref = frames[i - 1].getRef(_var)
            if (ref) return ref
        }
        throw new Error(`Unknown variable reference: ${_var}`)
    }
    this.getStackUsed = () => stackUsed
}

const getIRVariables = (fun) => {
    const res = {}
    const isIRVar = (obj) => ir.IRVar.prototype.isPrototypeOf(obj)

    for (const ins of fun){
        for (const field of ins.fields()){
            if (isIRVar(ins[field])){
                res[ins[field].name] = ins[field]
            } else if (Array.isArray(ins[field])){
                for (const v of ins[field]){
                    if (isIRVar(v)){
                        res[v.name] = v
                    }
                }
            }
        }
    }
    return Object.values(res)
}

const { RAX, RBP, RSP } = intr.Register
const {
    MOVQ, POPQ, PUSHQ, RET,
    SUBQ, CALL, JMP, JNE,
    CMPQ, ADDQ
} = intr.Mnemonic

function AssemblyGenerator(context){
    const asm = []

    const globals = new Globals()
    const emit = (l) => asm.push(l || '')
    let level = 0

    const indent = () => level++
    const dedent = () => level--
    const makeIndentation = () => '   '.repeat(Math.max(level, 0))
    const makeJumpTarget = (name, omitPrefix) => {
        return `${omitPrefix === undefined || !omitPrefix ? '.L' : ''}${name}`
    }

    const emitInsn = function(mnemonic, ...args){
        if (args.length === 0){
            emit(makeIndentation() + mnemonic)
            return
        }

        const formatValue = (value) => {
            if (isNumber(value)){
                return `\$${value}`
            }
            return value
        }
        emit(`${makeIndentation()}${mnemonic} ${args.map(f => formatValue(f)).join(', ')}`)
    }
    const emitLabel = function(name, omitPrefix){
        if (level > 0) {
            dedent()
            emit()
        }
        emit(`${makeIndentation()}${makeJumpTarget(name, omitPrefix)}:`)
        indent()
    }
    const emitComment = (text) => emit(`${makeIndentation()}# ${text}`)

    this.generate = function(){
        emit('.global main')
        emit('.type main, @function')
        emit('.extern print_int')
        emit('.extern print_bool')
        emit('.extern read_int')
        emit('.extern pow')
        emit('.section .text')
        emit()

        for (const fun of context){
            emitLabel(fun.ins.shift().name, true)
            emitInsn(PUSHQ, RBP)
            emitInsn(MOVQ, RSP, RBP)
            emitInsn(SUBQ, globals.pushFrame(getIRVariables(fun.ins)), RSP)
            fun.args.forEach((a, i) => emitInsn(MOVQ, intr.argMap[i], globals.getRef(a)))

            for (const ins of fun.ins){
                if (ins.constructor !== ir.Label) emitComment(ins)
                
                switch(ins.constructor){
                    case ir.Label: emitLabel(ins.name); break
                    case ir.LoadIntConst: emitInsn(MOVQ, ins.value, globals.getRef(ins.dest)); break
                    case ir.LoadBoolConst: emitInsn(MOVQ, ins.value ? 1 : 0, globals.getRef(ins.dest)); break
                    case ir.Copy: {
                        emitInsn(MOVQ, globals.getRef(ins.source), RAX)
                        emitInsn(MOVQ, RAX, globals.getRef(ins.dest))
                        break
                    }
                    case ir.Jump: emitInsn(JMP, makeJumpTarget(ins.label.name)); break
                    case ir.CondJump: {
                        emitInsn(CMPQ, 0, globals.getRef(ins.cond))
                        emitInsn(JNE, makeJumpTarget(ins.then.name))
                        emitInsn(JMP, makeJumpTarget(ins.elsz.name))
                        break
                    }
                    case ir.Return: {
                        emitInsn(MOVQ, ins.value ? globals.getRef(ins.value) : 0, RAX)
                        emitInsn(MOVQ, RBP, RSP)
                        emitInsn(POPQ, RBP)
                        emitInsn(RET)
                        globals.popFrame()
                        break
                    }
                    case ir.Call: {
                        if (intr.allIntrinsics[ins.fun]){
                            const intrinsic = intr.allIntrinsics[ins.fun]
                            intrinsic({
                                refs: ins.args.map(a => globals.getRef(a)),
                                emit: emitInsn
                            })
                        } else {
                            if (ins.args.length > 6){
                                throw new Error(`Invalid arity for function '${ins.fun}': args > 6`)
                            }
                            ins.args.forEach((arg, i) => emitInsn(MOVQ, globals.getRef(arg), intr.argMap[i]))
                            emitInsn(CALL, ins.fun)

                            if (ins.args.length > 0 && !intr.builtin.includes(ins.fun)){
                                emitInsn(ADDQ, ins.args.length * 8, RSP)
                            }
                        }
                        emitInsn(MOVQ, RAX, globals.getRef(ins.dest))
                        break
                    }
                    default: {
                        throw new Error(`Unknown instruction: ${ins}`)
                    }
                }
            }
        }
        emit()
        
        return asm.join(EOL)
    }
}

export { AssemblyGenerator }