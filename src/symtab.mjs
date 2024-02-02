function SymTab(parent){
    const locals = {}

    this.getParent = function(){
        return parent
    }
    this.addIfAbsent = function(sym, value){
        if (Array.isArray(sym)){
            sym.forEach(n => this.addIfAbsent(n, value))
            return
        }
        if (locals[sym] === undefined){
            locals[sym] = value
        }
    }
    this.addSymbol = function(sym, value){
        if (locals[sym] !== undefined){
            throw new Error(`Symbol ${sym} already defined`)
        }
        locals[sym] = value
    }
    this.addSymbols = function(sym, value){
        sym.forEach(s => this.addSymbol(s, value))
    }
    this.setSymbol = function(sym, value){
        if (locals[sym] !== undefined){
            locals[sym] = value    
        } else if (parent){
            parent.setSymbol(sym, value)
        } else {
            throw new Error(`Undefined symbol: ${sym}`)
        }
    }
    this.getSymbol = function(sym){
        const val = locals[sym]

        if (val !== undefined) return val
        if (parent) return parent.getSymbol(sym)
        throw new Error(`Undefined symbol: ${sym}`)
    }
    this.deleteSymbol = function(sym){
        delete locals[sym]
    }
    this.clear = function(){
        Object.keys(locals).forEach(sym => this.deleteSymbol(sym))
    }
}

export { SymTab }