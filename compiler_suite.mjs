import { SymTab } from './src/symtab.mjs'
import { Parser } from './src/parser.mjs'
import { Tokenizer } from './src/tokenizer.mjs'
import { Interpreter } from './src/interpreter.mjs'
import { IRGenerator } from './src/ir_generator.mjs'
import { ClearFn, ExitFn } from './src/types.mjs'
import { TypeChecker } from './src/type_checker.mjs'
import { Assembler } from './assembler.mjs'
import { AssemblyGenerator } from './src/assembly_generator.mjs'

const tcSetup = () => {
    const tcSym = new SymTab()
    tcSym.addSymbol('clear', ClearFn)
    tcSym.addSymbol('exit', ExitFn)
    return tcSym
}

const ipSetup = () => {
    const ipSym = new SymTab()
    ipSym.addSymbol('print_int', (i) => console.log(i))
    ipSym.addSymbol('print_bool', (b) => console.log(b))
    ipSym.addSymbol('read_int', () => rl.questionInt())
    ipSym.addSymbol('clear', () => console.clear())
    ipSym.addSymbol('exit', () => process.exit())
    return ipSym
}

let tcSym = tcSetup()
let ipSym = ipSetup()
let genSym = new SymTab()

const parse = (source, options) => {
    const scn = new Tokenizer(source, options)
    const parser = new Parser(scn.tokens(), options)
    return parser.parse()
}
const typecheck = (node, options) => {
    if (options?.reset) tcSym = tcSetup()
    const typechecker = new TypeChecker(tcSym)
    return typechecker.typecheck(node)
}
const parseAndCheck = (source, options) => {
    return typecheck(parse(source, options), { reset: options?.reset })
}
const interpret = (source, options) => {
    if (options.reset) ipSym = ipSetup()
    if (options.repl) options.fallthrough = true
    const interpreter = new Interpreter(ipSym)
    interpreter.interpret(parseAndCheck(source, options)).forEach(r => options.repl && options.callback(r))
}
const ir = (source, options) => {
    if (options?.reset) genSym = new SymTab()
    const irGen = new IRGenerator(genSym)
    return irGen.generate(parseAndCheck(source, options))
}
const asm = (source, options) => {
    const asmGen = new AssemblyGenerator(ir(source, options))
    return asmGen.generate()
}
const assemble = (source, options) => {
    options = options || {}
    options.out = options.out || 'a.out'
    options.tmpname = options.tmpname || 'asm'
    options.run = options.run || false
    options.reset = options.reset || false

    const rasm = new Assembler()
    return rasm.assemble(asm(source, { reset: options.reset }), options)
}

export { parse, typecheck, parseAndCheck, interpret, ir, asm, assemble }