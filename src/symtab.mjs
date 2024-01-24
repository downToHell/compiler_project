function SymTab(parent){
    const locals = {}

    this.addSymbol = function(name, value){
        if (locals[name]){
            throw new Error(`Symbol ${name} already defined`)
        }
        locals[name] = value
    }
    this.setSymbol = function(name, value){
        if (typeof locals[name] === 'undefined'){
            throw new Error(`Undefined symbol: ${name}`)
        }
        locals[name] = value
    }
    this.getSymbol = function(name){
        const sym = locals[name]

        if (typeof sym !== 'undefined') return sym
        if (parent) return parent.getSymbol(name)
        throw new Error(`Undefined symbol: ${name}`)
    }
    this.deleteSymbol = function(name){
        delete locals[name]
    }
}

export { SymTab }