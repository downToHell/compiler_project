const Register = Object.freeze({
    AL: '%al',
    RAX: '%rax',
    RDI: '%rdi',
    RDX: '%rdx',
    RBP: '%rbp',
    RSP: '%rsp'
})

const Mnemonic = Object.freeze({
    MOVQ: 'movq',
    PUSHQ: 'pushq',
    ADDQ: 'addq',
    SUBQ: 'subq',
    IMULQ: 'imulq',
    CALL: 'call',
    CQTO: 'cqto',
    CMPQ: 'cmpq',
    IDIVQ: 'idivq',
    NEGQ: 'negq',
    XORQ: 'xorq',
    POPQ: 'popq',
    SETE: 'sete',
    SETNE: 'setne',
    SETL: 'setl',
    SETLE: 'setle',
    SETG: 'setg',
    SETGE: 'setge',
    RET: 'ret'
})

const { AL, RAX, RDX } = Register
const {
    ADDQ, CMPQ, CQTO, IDIVQ,
    IMULQ, MOVQ, NEGQ, SETE,
    SETG, SETGE, SETL, SETLE,
    SETNE, SUBQ, XORQ
} = Mnemonic

const _unwrap = (options) => {
    options = options || {}
    const { res, refs, emit } = options

    if (!refs || !emit){
        throw new Error(`Assertion failed: refs != null, emit != null`)
    }
    return {
        res: res || RAX,
        refs,
        emit
    }
}

const unary_minus = (options) => {
    const a = _unwrap(options)
    a.emit(MOVQ, a.refs[0], a.res)
    a.emit(NEGQ, a.res)
}
const not = (options) => {
    const a = _unwrap(options)
    a.emit(MOVQ, a.refs[0], a.res)
    a.emit(XORQ, '0x1', a.res)
}
const plus = (options) => {
    const a = _unwrap(options)

    if (a.res !== a.refs[0]){
        a.emit(MOVQ, a.refs[0], a.res)
    }
    a.emit(ADDQ, a.refs[1], a.res)
}
const minus = (options) => {
    const a = _unwrap(options)

    if (a.res !== a.refs[0]){
        a.emit(MOVQ, a.refs[0], a.res)
    }
    a.emit(SUBQ, a.refs[1], a.res)
}
const multiply = (options) => {
    const a = _unwrap(options)

    if (a.res !== a.refs[0]){
        a.emit(MOVQ, a.refs[0], a.res)
    }
    a.emit(IMULQ, a.refs[1], a.res)
}
const divide = (options) => {
    const a = _unwrap(options)

    a.emit(MOVQ, a.refs[0], RAX)
    a.emit(CQTO)
    a.emit(IDIVQ, a.refs[1])

    if (a.res !== RAX){
        a.emit(MOVQ, RAX, a.res)
    }
}
const remainder = (options) => {
    const a = _unwrap(options)

    a.emit(MOVQ, a.refs[0], RAX)
    a.emit(CQTO)
    a.emit(IDIVQ, a.refs[1])

    if (a.res !== RDX){
        a.emit(MOVQ, RDX, a.res)
    }
}
const _intComparison = (options) => {
    const a = _unwrap(options)

    a.emit(XORQ, RAX, RAX)
    a.emit(MOVQ, a.refs[0], RDX)
    a.emit(CMPQ, a.refs[1], RDX)
    a.emit(options.setcc, AL)

    if (a.res !== RAX){
        a.emit(MOVQ, RAX, a.res)
    }
}
const eq = (options) => _intComparison(options, SETE)
const ne = (options) => _intComparison(options, SETNE)
const lt = (options) => _intComparison(options, SETL)
const le = (options) => _intComparison(options, SETLE)
const gt = (options) => _intComparison(options, SETG)
const ge = (options) => _intComparison(options, SETGE)

const allIntrinsics = {
    'unary_-': unary_minus,
    'not': not,
    '+': plus,
    '-': minus,
    '*': multiply,
    '/': divide,
    '%': remainder,
    '==': eq,
    '!=': ne,
    '<': lt,
    '<=': le,
    '>': gt,
    '>=': ge
}

export { Register, Mnemonic, allIntrinsics }