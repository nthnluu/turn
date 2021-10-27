import WorkflowInterpreter, {Body, NodeBody, WorkflowError, WorkflowErrors} from '../core/interpreter';
import {BinaryOperation, Identifier, IfStatement, Literal} from "../core/expressions";
import {DeclareVar, Return} from "../core/statements";

test("Identifier throws a WorkflowError if evaluated while unbound", async () => {
    const evaluator = new WorkflowInterpreter();
    const sampleWorkflowStepTree: Body = NodeBody([
        Identifier("someUnboundVar")
    ]);

    await expect(evaluator.run(sampleWorkflowStepTree)).rejects.toEqual(
        new WorkflowError(WorkflowErrors.UNBOUND_IDENTIFIER, "Attempted to evaluate unbound identifier: someUnboundVar!")
    );
});

test('Variable Scoping', () => {
    const evaluator = new WorkflowInterpreter();

    const sampleWorkflowStepTree = (cond: boolean): Body => {
        return NodeBody([
            DeclareVar("x", Literal("initial val")),
            IfStatement(Literal(cond),
                NodeBody([
                    DeclareVar("x", Literal("inside if-statement val")),
                    Return(Identifier("x")),
                ]),
                NodeBody([
                    Return(Identifier("x"))
                ]))
        ]);
    };

    evaluator.run(sampleWorkflowStepTree(true))
        .then(result => expect(result).toBe("inside if-statement val"))
        .catch(err => console.log(err))

    evaluator.run(sampleWorkflowStepTree(false))
        .then(result => expect(result).toBe("initial val"));
});

test('Return Statement', () => {
    const evaluator = new WorkflowInterpreter();

    const sampleWorkflowStepTree = (cond: boolean): Body => {
        return NodeBody([
            IfStatement(Literal(cond),
                NodeBody([
                    Return(Literal("returned from inside if")),
                ]),
                NodeBody([])),
            Literal("returned from end of program")
        ]);
    };

    evaluator.run(sampleWorkflowStepTree(true))
        .then(result => expect(result).toBe("returned from inside if"));

    evaluator.run(sampleWorkflowStepTree(false))
        .then(result => expect(result).toBe("returned from end of program"));
});

test('BinaryOperator', () => {
    const evaluator = new WorkflowInterpreter();

    const sampleWorkflowStepTree = NodeBody([
        BinaryOperation("+", Literal("Hello, "), Literal("world!"))
    ]);

    evaluator.run(sampleWorkflowStepTree)
        .then(result => expect(result).toBe("Hello, world!"));
});

test('Arguments', async () => {
    const evaluator = new WorkflowInterpreter();

    const sampleWorkflowStepTree = NodeBody([Return(Identifier("arg1"))]);

    evaluator.run(sampleWorkflowStepTree, {"arg1": "My cute argument!"})
        .then(result => expect(result).toBe("My cute argument!"));

    const sampleWorkflowStepTree1 = NodeBody([DeclareVar("arg1", Literal("no!")), Return(Identifier("arg1"))]);

    await expect(evaluator.run(sampleWorkflowStepTree1, {"arg1": "My cute argument!"})).rejects.toEqual(
        new WorkflowError(WorkflowErrors.NAME_ALREADY_BOUND, "arg1 is already bound in environment!")
    );
});
