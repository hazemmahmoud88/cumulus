const { buildAndExecuteWorkflow } = require('@cumulus/integration-tests');
const { ActivityStep } = require('@cumulus/integration-tests/sfnStep');
const { getExecution } = require('@cumulus/api-client/executions');
const { loadConfig } = require('../../helpers/testUtils');
const { waitForApiStatus } = require('../../helpers/apiUtils');

const activityStep = new ActivityStep();

describe('The Hello World workflow using ECS and CMA Layers', () => {
  let workflowExecution;
  let config;

  beforeAll(async () => {
    config = await loadConfig();

    process.env.ExecutionsTable = `${config.stackName}-ExecutionsTable`;

    workflowExecution = await buildAndExecuteWorkflow(
      config.stackName,
      config.bucket,
      'EcsHelloWorldWorkflow'
    );
  });

  it('executes successfully', () => {
    expect(workflowExecution.status).toEqual('SUCCEEDED');
  });

  describe('the HelloWorld ECS', () => {
    let activityOutput;

    beforeAll(async () => {
      activityOutput = await activityStep.getStepOutput(
        workflowExecution.executionArn,
        'EcsTaskHelloWorld'
      );
    });

    it('output is Hello World', () => {
      expect(activityOutput.payload).toEqual({ hello: 'Hello World' });
    });
  });

  describe('the reporting lambda has received the cloudwatch stepfunction event and', () => {
    it('the execution record is added to DynamoDB', async () => {
      const record = await waitForApiStatus(
        getExecution,
        {
          prefix: config.stackName,
          arn: workflowExecution.executionArn,
        },
        'completed'
      );
      expect(record.status).toEqual('completed');
    });
  });
});
