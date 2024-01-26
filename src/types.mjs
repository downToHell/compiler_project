export function BasicType(name){
    this.name = name
    this.toString = () => this.name
}

const Int = new BasicType('Int')
const Bool = new BasicType('Bool')
const Unit = new BasicType('Unit')

export { Int, Bool, Unit }