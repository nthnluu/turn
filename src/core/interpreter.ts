import {
    APICallConfig, BinaryOperationConfig,
    Expression,
    ExpressionTypes,
    IdentifierConfig,
    IfStatementConfig,
} from "./expressions";
import {
    DeclareVarConfig,
    PrintConfig,
    ReturnConfig,
    Statement,
    StatementTypes
} from "./statements";

export type PrimitiveType = string | boolean | number;

type Node = Expression | Statement;

export enum NodeTypes {
    EXPRESSION,
    STATEMENT
}

export interface Body {
    body: Node[];
}

/** Represents a series of actions to be executed sequentially. */
export function NodeBody(nodes: Node[]): Body {
    return {body: nodes}
}

export enum WorkflowErrors {
    API_CALL_FAILED,
    UNBOUND_IDENTIFIER,
    UNDEFINED_LITERAL,
    NAME_ALREADY_BOUND
}

/** Thrown when the workflow is intentionally stopped by a step */
class ReturnSignal {
    /** The value to output from the workflow */
    output?: any;

    constructor(output?: any) {
        this.output = output;
    }
}

/** Thrown when the workflow encounters an error during evaluation */
export class WorkflowError {
    /** Internal error code */
    error: WorkflowErrors;
    /** A human-readable description of the error */
    msg: string;
    /** Raw error info, if available */
    rawError?: any;

    constructor(error: WorkflowErrors, msg: string, rawError?: any) {
        this.error = error;
        this.msg = msg;
        this.rawError = rawError;
    }
}

export default class WorkflowInterpreter {
    private stack: { [key: string]: PrimitiveType }[] = [];

    constructor() {
    }

    /** Returns the value of the literal */
    private evalLiteral = async (expression: Expression): Promise<PrimitiveType> => {
        const {value} = expression.config;

        if (value) {
            return value;
        } else {
            throw new WorkflowError(WorkflowErrors.UNDEFINED_LITERAL, "Attempted to evaluate undefined literal!");
        }
    };

    /** Looks up a value in the environment and returns its value if found */
    private async evalIdentifier(expression: Expression<IdentifierConfig>): Promise<PrimitiveType> {
        const {name} = expression.config;

        for (let i = 0; i < this.stack.length; i++) {
            if (name in this.stack[(this.stack.length - 1) - i]) {
                return this.stack[(this.stack.length - 1) - i][name];
            }
        }

        throw new WorkflowError(WorkflowErrors.UNBOUND_IDENTIFIER, `Attempted to evaluate unbound identifier: ${name}!`);
    }

    /** Looks up a value in the environment and returns its value if found */
    private async evalDeclareVar(node: Statement<DeclareVarConfig>): Promise<string | number | void | boolean> {
        const {name, value} = node.config;
        const currStackFrame = this.stack[(this.stack.length - 1)];

        if (name in currStackFrame) {
            throw new WorkflowError(WorkflowErrors.NAME_ALREADY_BOUND, `${name} is already bound in environment!`);
        } else {
            const val = await this.evalExpression(value);
            // @ts-ignore
            currStackFrame[name] = val;
            return val;
        }
    }

    /** Evaluates an if-statement */
    private async evalIfStatement(node: Expression<IfStatementConfig>) {
        const {condition, then, els} = node.config;

        if (await this.evalExpression(condition)) {
            return await this.evalNodes(then);
        } else {
            return await this.evalNodes(els);
        }
    }

    /** Evaluates a binary operation */
    private async evalBinaryOperation(node: Expression<BinaryOperationConfig>) {
        const {operator, leftValue, rightValue} = node.config;

        switch (operator) {
            case "+":
                // @ts-ignore
                return (await this.evalExpression(leftValue)) + (await this.evalExpression(rightValue));
            case "<":
                return (await this.evalExpression(leftValue)) < (await this.evalExpression(rightValue));
            case "<=":
                return (await this.evalExpression(leftValue)) <= (await this.evalExpression(rightValue));
            case ">":
                return (await this.evalExpression(leftValue)) > (await this.evalExpression(rightValue));
            case ">=":
                return (await this.evalExpression(leftValue)) >= (await this.evalExpression(rightValue));
            case "==":
                return (await this.evalExpression(leftValue)) == (await this.evalExpression(rightValue));
            case "!=":
                return (await this.evalExpression(leftValue)) != (await this.evalExpression(rightValue));

        }
    }

    /** Stops workflow execution by throwing a return signal with an optional output */
    private async evalReturn(node: Statement<ReturnConfig>) {
        const {value} = node.config;

        if (value) {
            throw new ReturnSignal(await this.evalExpression(value));
        } else {
            throw new ReturnSignal();
        }
    }

    /** Prints the contents of valueExpr/value to the console */
    private async evalPrint(node: Statement<PrintConfig>) {
        console.log(await this.evalExpression(node.config.value));
    }

    /** Makes an API call and returns the result */
    private async evalAPICall(node: Expression<APICallConfig>) {
        const {apiCallConfig} = node.config;

        try {
            const res = await fetch(apiCallConfig);
            console.log(res)
            return res;
        } catch (e) {
            throw new WorkflowError(WorkflowErrors.API_CALL_FAILED, "Error while executing API call.", e);
        }
    }

    /** Evaluates a statement */
    private async evalStatement(statement: Statement): Promise<void> {
        switch (statement.type) {
            case StatementTypes.DeclareVar:
                await this.evalDeclareVar(statement);
                break;
            case StatementTypes.Return:
                await this.evalReturn(statement);
                break;
            case StatementTypes.Print:
                await this.evalPrint(statement);
                break;
        }
    }

    /** Evaluates a node and returns its value */
    private async evalExpression(expression: Expression): Promise<PrimitiveType> {
        switch (expression.type) {
            case ExpressionTypes.Literal:
                return await this.evalLiteral(expression);
            case ExpressionTypes.Identifier:
                return await this.evalIdentifier(expression);
            case ExpressionTypes.BinaryOperation:
                return await this.evalBinaryOperation(expression);
            case ExpressionTypes.IfStatement:
                return await this.evalIfStatement(expression);
            default:
                return false;
        }
    }

    /** Evaluates every step in a step tree sequentially */
    private async evalNodes(nodes: Body, env = {}): Promise<PrimitiveType> {
        // push a new frame onto the stack to create a new scope
        this.stack.push(env);
        let output: PrimitiveType = true;

        for (const node of nodes.body) {
            switch (node.nodeType) {
                case NodeTypes.EXPRESSION:
                    output = await this.evalExpression(node);
                    break;
                case NodeTypes.STATEMENT:
                    await this.evalStatement(node);
                    break;
            }
        }

        // pop frame off the stack to remove scope
        this.stack.pop();

        return output;
    }

    /** Runs the workflow. */
    async run(stepTree: Body, args = {}) {
        // clear the stack from previous executions
        this.stack = [];

        try {
            return await this.evalNodes(stepTree, args);
        } catch (e) {
            if (e instanceof ReturnSignal) {
                // return output if the exception is a ReturnSignal
                return e.output;
            } else {
                throw e;
            }
        }
    }
}