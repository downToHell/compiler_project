function SourceLocation(column, line){
    this.column = column
    this.line = line

    this.copy = (cOffset, lOffset) => {
        cOffset = cOffset || 0
        lOffset = lOffset || 0
        return new SourceLocation(column+cOffset, line+lOffset)
    }
    this.toString = () => `[${line}:${column}]`
}

function SourceContext(inp){
    let column = 1, line = 1, pos = 0
    let currentLoc = new SourceLocation(column, line)

    this.col = () => column
    this.line = () => line
    this.loc = () => {
        let oldLoc = currentLoc
        currentLoc = new SourceLocation(column, line)
        return oldLoc
    }

    this.isEOF = () => pos >= inp.length
    this.peek = () => inp[pos]
    this.match = (ch) => this.peek() === ch
    this.consume = (ch) => {
        if (this.match(ch)){
            this.advance()
            return true
        }
        return false
    }
    this.advance = () => {
        if (this.isEOF()){
            throw new Error('End of file reached.')
        }
        let ch = inp[pos++]

        if (ch === '\r' || ch === '\n'){
            line++
            column = 1
        } else {
            column++
        }
        return ch
    }
}

const L = new SourceLocation(-1, -1)

export { SourceLocation, SourceContext, L }