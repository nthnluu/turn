import {Body, NodeTypes, PrimitiveType,} from "./interpreter";

/** Expression types */
export enum ExpressionTypes {
    Literal,
    Identifier,
    IfStatement,
    BinaryOperation,
    APICall
}

export interface Expression<ExpConfig = any> {
    nodeType: NodeTypes.EXPRESSION;
    type: ExpressionTypes;
    config: ExpConfig;
}

function expression<T>(type: ExpressionTypes, config: T): Expression<T> {
    return {
        nodeType: NodeTypes.EXPRESSION,
        type: type,
        config: config
    }
}

export interface LiteralConfig {
    value: PrimitiveType;
}

/** Expression that evaluates to a primitive type. */
export function Literal(value: PrimitiveType): Expression<LiteralConfig> {
    return expression<LiteralConfig>(ExpressionTypes.Literal, {value});
}

export interface IdentifierConfig {
    name: string;
}

/** Returns an expression that looks up a specified name in the environment and returns the value. */
export function Identifier(name: string): Expression<IdentifierConfig> {
    return expression<IdentifierConfig>(ExpressionTypes.Identifier, {name});
}

export type BinaryOperator = "*" | "+" | "<" | "<=" | ">" | ">=" | "==" | "!=";

export interface BinaryOperationConfig {
    operator: BinaryOperator;
    leftValue: Expression;
    rightValue: Expression;
}

/** Returns an expression that evaluates binary operation between two expressions */
export function BinaryOperation(operator: BinaryOperator, leftValue: Expression, rightValue: Expression): Expression<BinaryOperationConfig> {
    return expression<BinaryOperationConfig>(ExpressionTypes.BinaryOperation, {operator, leftValue, rightValue});
}

export interface APICallConfig {
    apiCallConfig: any;
}

/** Expression that makes an API call and stores the response as a variable. */
export function APICall(apiCallConfig: any): Expression<APICallConfig> {
    return expression<APICallConfig>(ExpressionTypes.APICall, {apiCallConfig});
}

export interface IfStatementConfig {
    condition: Expression,
    then: Body,
    els: Body
}

/** Control flow statement that evaluates two separate step trees based on a condition. */
export function IfStatement(condition: Expression, then: Body, els: Body): Expression<IfStatementConfig> {
    return expression<IfStatementConfig>(ExpressionTypes.IfStatement, {condition, then, els});
}