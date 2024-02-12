import { SymTab } from './src/symtab.mjs'
import { Parser } from './src/parser.mjs'
import { Tokenizer } from './src/tokenizer.mjs'
import { Interpreter } from './src/interpreter.mjs'
import { IRGenerator } from './src/ir_generator.mjs'
import { ClearFn, ExitFn } from './src/types.mjs'
import { TypeChecker } from './src/type_checker.mjs'
import { Assembler } from './assembler.mjs'
import { AssemblyGenerator } from './src/assembly_generator.mjs'

const tcSym = new SymTab()
const ipSym = new SymTab()
const genSym = new SymTab()

tcSym.addSymbol('clear', ClearFn)
tcSym.addSymbol('exit', ExitFn)

ipSym.addSymbol('print_int', (i) => console.log(i))
ipSym.addSymbol('print_bool', (b) => console.log(b))
ipSym.addSymbol('read_int', () => rl.questionInt())
ipSym.addSymbol('clear', () => console.clear())
ipSym.addSymbol('exit', () => process.exit())

const parse = (source) => {
    const scn = new Tokenizer(source)
    const parser = new Parser(scn.tokens())
    return parser.parse()
}
const typecheck = (node) => {
    const typechecker = new TypeChecker(tcSym)
    return typechecker.typecheck(node)
}
const parseAndCheck = (source) => parse(source).filter(e => typecheck(e) && e)
const interpret = (source, callback) => {
    const interpreter = new Interpreter(ipSym)
    parseAndCheck(source).forEach(e => callback(interpreter.interpret(e)))
}
const ir = (source) => {
    const irGen = new IRGenerator(genSym)
    return parseAndCheck(source).flatMap(e => irGen.generate(e))
}
const asm = (source) => {
    const asmGen = new AssemblyGenerator(ir(source))
    return asmGen.generate()
}
const assemble = (source, options) => {
    options = options || {}
    options.out = options.out || 'a.out'
    options.tmpname = options.tmpname || 'asm'
    options.run = options.run || false

    const rasm = new Assembler()
    return rasm.assemble(asm(source), options)
}

export { parse, typecheck, parseAndCheck, interpret, ir, asm, assemble }