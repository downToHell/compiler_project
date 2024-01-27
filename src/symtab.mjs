function SymTab(parent){
    const locals = {}

    this.getParent = function(){
        return parent
    }
    this.addIfAbsent = function(name, value){
        if (locals[name] === undefined){
            locals[name] = value
        }
    }
    this.addSymbol = function(name, value){
        if (locals[name] !== undefined){
            throw new Error(`Symbol ${name} already defined`)
        }
        locals[name] = value
    }
    this.addSymbols = function(names, value){
        for (const name of names){
            this.addSymbol(name, value)
        }
    }
    this.setSymbol = function(name, value){
        if (locals[name] !== undefined){
            locals[name] = value    
        } else if (parent){
            parent.setSymbol(name, value)
        } else {
            throw new Error(`Undefined symbol: ${name}`)
        }
    }
    this.getSymbol = function(name){
        const sym = locals[name]

        if (sym !== undefined) return sym
        if (parent) return parent.getSymbol(name)
        throw new Error(`Undefined symbol: ${name}`)
    }
    this.deleteSymbol = function(name){
        delete locals[name]
    }
}

export { SymTab }