const Register = Object.freeze({
    AL: '%al',
    RAX: '%rax',
    RDI: '%rdi',
    RSI: '%rsi',
    RDX: '%rdx',
    RCX: '%rcx',
    RBP: '%rbp',
    RSP: '%rsp',
    R8: '%r8',
    R9: '%r9'
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
    JMP: 'jmp',
    JNE: 'jne',
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

const { AL, RAX, RDX, RCX, RDI, RSI, R8, R9 } = Register
const {
    ADDQ, CMPQ, CQTO, IDIVQ,
    IMULQ, MOVQ, NEGQ, SETE,
    SETG, SETGE, SETL, SETLE,
    SETNE, SUBQ, XORQ, CALL
} = Mnemonic

const argMap = Object.freeze([RDI, RSI, RDX, RCX, R8, R9])

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
const pow = (options) => {
    const a = _unwrap(options)

    a.emit(MOVQ, a.refs[0], RDI);
    a.emit(MOVQ, a.refs[1], RSI);
    a.emit(CALL, 'pow');

    if (a.res !== RAX){
        a.emit(MOVQ, RAX, a.res)
    }
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
const _intComparison = (options, setcc) => {
    const a = _unwrap(options)

    a.emit(XORQ, RAX, RAX)
    a.emit(MOVQ, a.refs[0], RDX)
    a.emit(CMPQ, a.refs[1], RDX)
    a.emit(setcc, AL)

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
    '**': pow,
    '/': divide,
    '%': remainder,
    '==': eq,
    '!=': ne,
    '<': lt,
    '<=': le,
    '>': gt,
    '>=': ge
}

export { Register, Mnemonic, argMap, allIntrinsics }