import assert from 'node:assert'
import * as ast from '../src/ast.mjs'

function GuardedTestNode(){
    let topLevelCalled = false

    this.__topLevelCall = (_var) => {
        topLevelCalled = true
        return _var
    }
    this.__check = (guard) => {
        if (!topLevelCalled) {
            throw new Error(`Must call '${guard.name}' first!`)
        }
    }
    this.__checkedCall = (_var, guard) => {
        this.__check(guard)
        return _var
    }
}

function FunNode(expr){
    GuardedTestNode.call(this)

    this.isFunDecl = function isFunDecl(){
        assert.ok(expr instanceof ast.FunDecl)
        return this.__topLevelCall(this) 
    }
    this.andIdent = (callback) => {
        callback(this.__checkedCall(new TreeTester(expr.ident), this.isFun))
        return this
    }
    this.andArgAt = (i, callback) => {
        this.__check(this.isFun)
        assert.ok(expr.args.length > i)
        callback(this.__checkedCall(new TreeTester(expr.args[i])))
        return this
    }
    this.andBody = (callback) => {
        callback(this.__checkedCall(new TreeTester(expr.body), this.isFun))
        return this
    }
    this.andRetType = (callback) => {
        callback(this.__checkedCall(new TreeTester(expr.retType), this.isFun))
        return this
    }
}

function BlockNode(expr){
    GuardedTestNode.call(this)

    this.isBlock = function isBlock(){
        assert.ok(expr instanceof ast.Block)
        return this.__topLevelCall(this)
    }
    this.andExprAt = (i, callback) => {
        this.__check(this.isBlock)
        assert.ok(expr.exprs.length > i)
        callback(new TreeTester(expr.exprs[i]))
        return this
    }
}

function BinaryNode(expr){
    GuardedTestNode.call(this)

    this.isBinaryExpr = function isBinaryExpr(){
        assert.ok(expr instanceof ast.BinaryExpr)
        return this.__topLevelCall(this)
    }
    this.hasOperator = (op) => {
        this.__check(this.isBinaryExpr)
        assert.strictEqual(expr.op, op)
        return this
    }
    this.andLeft = (callback) => {
        callback(this.__checkedCall(new TreeTester(expr.left), this.isBinaryExpr))
        return this
    }
    this.andRight = (callback) => {
        callback(this.__checkedCall(new TreeTester(expr.right), this.isBinaryExpr))
        return this
    }
}

function LogicalNode(expr){
    GuardedTestNode.call(this)

    this.isLogicalExpr = function isLogicalExpr(){
        assert.ok(expr instanceof ast.LogicalExpr)
        return this.__topLevelCall(this)
    }
    this.hasOperator = (op) => {
        this.__check(this.isLogicalExpr)
        assert.strictEqual(expr.op, op)
        return this
    }
    this.andLeft = (callback) => {
        callback(this.__checkedCall(new TreeTester(expr.left), this.isLogicalExpr))
        return this
    }
    this.andRight = (callback) => {
        callback(this.__checkedCall(new TreeTester(expr.right), this.isLogicalExpr))
        return this
    }
}

function UnaryNode(expr){
    GuardedTestNode.call(this)

    this.isUnaryExpr = function isUnaryExpr(){
        assert.ok(expr instanceof ast.UnaryExpr)
        return this.__topLevelCall(this)
    }
    this.hasOperator = (op) => {
        this.__check(this.isUnaryExpr)
        assert.strictEqual(expr.op, op)
        return this
    }
    this.andRight = (callback) => {
        callback(this.__checkedCall(new TreeTester(expr.right), this.isUnaryExpr))
        return this
    }
}

function GroupingNode(expr){
    GuardedTestNode.call(this)

    this.isGrouping = function isGrouping(){
        assert.ok(expr instanceof ast.Grouping)
        return this.__topLevelCall(this)
    }
    this.andExpr = (callback) => {
        this.__check(this.isGrouping)
        callback(new TreeTester(expr.expr))
        return this
    }
}

function AssignmentNode(expr){
    GuardedTestNode.call(this)

    this.isAssignment = function isAssignment(){
        assert.ok(expr instanceof ast.Assignment)
        return this.__topLevelCall(this)
    }
    this.andTarget = (callback) => {
        callback(this.__checkedCall(new TreeTester(expr.target), this.isAssignment))
        return this
    }
    this.andExpr = (callback) => {
        callback(this.__checkedCall(new TreeTester(expr.expr), this.isAssignment))
        return this
    }
}

function IfNode(expr){
    GuardedTestNode.call(this)

    this.isIfExpr = function isIfExpr(){
        assert.ok(expr instanceof ast.IfExpr)
        return this.__topLevelCall(this)
    }
    this.andCond = (callback) => {
        callback(this.__checkedCall(new TreeTester(expr.cond), this.isIfExpr))
        return this
    }
    this.andBody = (callback) => {
        callback(this.__checkedCall(new TreeTester(expr.body), this.isIfExpr))
        return this
    }
    this.andElse = (callback) => {
        callback(this.__checkedCall(new TreeTester(expr.elsz), this.isIfExpr))
        return this
    }
}

function WhileNode(expr){
    GuardedTestNode.call(this)

    this.isWhileExpr = function isWhileExpr(){
        assert.ok(expr instanceof ast.WhileExpr)
        return this.__topLevelCall(this)
    }
    this.andCond = (callback) => {
        callback(this.__checkedCall(new TreeTester(expr.cond), this.isWhileExpr))
        return this
    }
    this.andBody = (callback) => {
        callback(this.__checkedCall(new TreeTester(expr.body), this.isWhileExpr))
        return this
    }
}

function CallNode(expr){
    GuardedTestNode.call(this)

    this.isCall = function isCall(){
        assert.ok(expr instanceof ast.Call)
        return this.__topLevelCall(this)
    }
    this.andTarget = (callback) => {
        callback(this.__checkedCall(new TreeTester(expr.target), this.isCall))
        return this
    }
    this.andArgAt = (i, callback) => {
        this.__check(this.isCall)
        assert.ok(expr.args.length > i)
        callback(new TreeTester(expr.args[i]))
        return this
    }
}

function ReturnNode(expr){
    GuardedTestNode.call(this)

    this.isReturn = function isReturn(){
        assert.ok(expr instanceof ast.Return)
        return this.__topLevelCall(this)
    }
    this.andValue = (callback) => {
        this.__check(this.isReturn)
        callback(new TreeTester(expr.value))
        return this
    }
}

function VarNode(expr){
    GuardedTestNode.call(this)

    this.isVarDecl = () => {
        assert.ok(expr instanceof ast.VarDecl)
        return this.__topLevelCall(this)
    }
    this.andIdent = (callback) => {
        this.__check(this.isVarDecl)
        callback(new TreeTester(expr.ident))
        return this
    }
    this.andInitializer = (callback) => {
        this.__check(this.isVarDecl)
        callback(new TreeTester(expr.initializer))
        return this
    }
}

function TypeNode(expr){
    GuardedTestNode.call(this)

    this.isTypeExpr = function isTypeExpr(){
        assert.ok(expr instanceof ast.TypeExpr)
        return this.__topLevelCall(this)
    }
    this.andType = (callback) => {
        this.__check(this.isTypeExpr)
        callback(new TreeTester(expr.type))
        return this
    }
    this.andExpr = (callback) => {
        this.__check(this.isTypeExpr)
        callback(new TreeTester(expr.expr))
        return this
    }
}

function LiteralNode(expr){
    GuardedTestNode.call(this)

    this.isLiteral = function isLiteral(){
        assert.ok(expr instanceof ast.Literal)
        return this.__topLevelCall(this)
    }
    this.hasValue = (val) => {
        this.__check(this.isLiteral)
        assert.strictEqual(expr.value, val)
        return this
    }
}

function IdentifierNode(expr){
    GuardedTestNode.call(this)

    this.isIdentifier = function isIdentifier(){
        assert.ok(expr instanceof ast.Identifier)
        return this.__topLevelCall(this)
    }
    this.hasName = (val) => {
        this.__check(this.isIdentifier)
        assert.strictEqual(expr.name, val)
        return this
    }
}

function TreeTester(expr){
    this.isFunDecl = () => new FunNode(expr).isFunDecl()
    this.isBlock = () => new BlockNode(expr).isBlock()
    this.isBinaryExpr = () => new BinaryNode(expr).isBinaryExpr()
    this.isLogicalExpr = () => new LogicalNode(expr).isLogicalExpr()
    this.isUnaryExpr = () => new UnaryNode(expr).isUnaryExpr()
    this.isGrouping = () => new GroupingNode(expr).isGrouping()
    this.isAssignment = () => new AssignmentNode(expr).isAssignment()
    this.isIfExpr = () => new IfNode(expr).isIfExpr()
    this.isWhileExpr = () => new WhileNode(expr).isWhileExpr()
    this.isCall = () => new CallNode(expr).isCall()
    this.isReturn = () => new ReturnNode(expr).isReturn()
    this.isVarDecl = () => new VarNode(expr).isVarDecl()
    this.isTypeExpr = () => new TypeNode(expr).isTypeExpr()
    this.isLiteral = () => new LiteralNode(expr).isLiteral()
    this.isIdentifier = () => new IdentifierNode(expr).isIdentifier()
    this.isUndefined = () => assert.ok(expr === undefined)
    this.isNull = () => assert.ok(expr === null)
}

export const expect = (expr) => new TreeTester(expr)