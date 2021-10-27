import {NodeTypes} from "./interpreter";
import {Expression} from "./expressions";

export enum StatementTypes {
    DeclareVar,
    Return,
    Print
}

export interface Statement<StatementConfig = any> {
    nodeType: NodeTypes.STATEMENT;
    type: StatementTypes;
    config: StatementConfig;
}

function statement<T>(type: StatementTypes, config: T): Statement<T> {
    return {
        nodeType: NodeTypes.STATEMENT,
        type: type,
        config: config
    }
}

export interface DeclareVarConfig {
    name: string;
    value: Expression;
}

/** Statement that binds a name to a value in the environment. */
export function DeclareVar(name: string, value: Expression): Statement<DeclareVarConfig> {
    return statement<DeclareVarConfig>(StatementTypes.DeclareVar, {name, value});
}

export interface ReturnConfig {
    value?: Expression
}

/** Statement causes the workflow to terminate and optionally output a value. */
export function Return(value?: Expression): Statement<ReturnConfig> {
    return statement<ReturnConfig>(StatementTypes.Return, {value});
}

export interface PrintConfig {
    value: Expression
}

/** Statement that evaluates an expression then prints the value to the console. */
export function Print(value: Expression): Statement<PrintConfig> {
    return statement<PrintConfig>(StatementTypes.Print, {value});
}