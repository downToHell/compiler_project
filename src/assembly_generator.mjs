import { EOL } from 'os'
import * as ir from './ir.mjs'
import * as intr from './intrinsics.mjs'
import { isNumber } from './tokenizer.mjs'

function Locals(variables){
    let stackUsed = 8
    let varMap = {}

    for (const _var of variables){
        if (varMap[_var] === undefined){
            varMap[_var] = `-${stackUsed}(${RBP})`
            stackUsed += 8
        }
    }
    this.getRef = (_var) => varMap[_var]
    this.getStackUsed = () => stackUsed
}

const getIRVariables = (instructions) => {
    const res = {}

    for (const ins of instructions){
        for (const field of ins.fields()){
            if (ir.IRVar.prototype.isPrototypeOf(ins[field])){
                res[ins[field].name] = ins[field]
            } else if (Array.isArray(ins[field])){
                for (const v of ins[field]){
                    if (ir.IRVar.prototype.isPrototypeOf(ins[field])){
                        res[ins[field].name] = ins[field]
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
    CMPQ
} = intr.Mnemonic

function AssemblyGenerator(instructions){
    const asm = []

    const locals = new Locals(getIRVariables(instructions))
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

        const format_value = (value) => {
            if (isNumber(value)){
                return `\$${value}`
            }
            return value
        }
        emit(`${makeIndentation()}${mnemonic} ${args.map(f => format_value(f)).join(', ')}`)
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
        emitLabel('main', true)
        emitInsn(PUSHQ, RBP)
        emitInsn(MOVQ, RSP, RBP)
        emitInsn(SUBQ, locals.getStackUsed(), RSP)
        emitLabel('start')

        for (const ins of instructions){
            if (ins.constructor !== ir.Label) emitComment(ins)
            
            switch(ins.constructor){
                case ir.Label: emitLabel(ins.name); break
                case ir.LoadIntConst: emitInsn(MOVQ, ins.value, locals.getRef(ins.dest)); break
                case ir.LoadBoolConst: emitInsn(MOVQ, ins.value ? 1 : 0, locals.getRef(ins.dest)); break
                case ir.Copy: {
                    emitInsn(MOVQ, locals.getRef(ins.source), RAX)
                    emitInsn(MOVQ, RAX, locals.getRef(ins.dest))
                    break
                }
                case ir.Jump: emitInsn(JMP, makeJumpTarget(ins.label.name)); break
                case ir.CondJump: {
                    emitInsn(CMPQ, 0, locals.getRef(ins.cond))
                    emitInsn(JNE, makeJumpTarget(ins.then.name))
                    emitInsn(JMP, makeJumpTarget(ins.elsz.name))
                    break
                }
                case ir.Call: {
                    if (intr.allIntrinsics[ins.fun]){
                        const intrinsic = intr.allIntrinsics[ins.fun]
                        intrinsic({
                            refs: ins.args.map(a => locals.getRef(a)),
                            emit: emitInsn
                        })
                    } else {
                        if (ins.args.length > 6){
                            throw new Error(`Invalid arity for function '${ins.fun}': args > 6`)
                        }
                        ins.args.forEach((arg, i) => emitInsn(MOVQ, locals.getRef(arg), intr.argMap[i]))
                        emitInsn(CALL, ins.fun)
                    }
                    emitInsn(MOVQ, RAX, locals.getRef(ins.dest))
                    break
                }
                default: {
                    throw new Error(`Unknown instruction: ${ins}`)
                }
            }
        }
        emitInsn(MOVQ, 0, RAX)
        emitInsn(MOVQ, RBP, RSP)
        emitInsn(POPQ, RBP)
        emitInsn(RET)
        emit()

        return asm.join(EOL)
    }
    
}

export { AssemblyGenerator }