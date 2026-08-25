export const meta = {
  name: 'lab-service-validation',
  description: 'Comprehensive validation of Lab Service endpoints, integrations, and data integrity',
  phases: [
    { title: 'Health Check', detail: 'Verify service availability' },
    { title: 'Endpoint Testing', detail: 'Test all 19 Lab Service endpoints' },
    { title: 'Integration Testing', detail: 'Test service dependencies' },
    { title: 'Data Integrity', detail: 'Validate data consistency' },
    { title: 'Report Generation', detail: 'Compile validation results' },
  ],
}

phase('Health Check')
const healthCheck = await agent(
  `Check if ClinicCare services are running and healthy:
   - Test Lab Service on port 8006
   - Test API Gateway on port 8000
   - Check Patient Service integration
   - Check database connectivity
   Return: service status, endpoints reachable, database state`,
  {
    label: 'service-health',
    phase: 'Health Check',
    schema: {
      type: 'object',
      properties: {
        lab_service: { type: 'string' },
        gateway: { type: 'string' },
        patient_service: { type: 'string' },
        database: { type: 'string' },
        seed_data_loaded: { type: 'boolean' }
      }
    }
  }
)

phase('Endpoint Testing')
const endpoints = [
  { method: 'GET', path: '/api/labs/tests', name: 'List Tests' },
  { method: 'POST', path: '/api/labs/tests', name: 'Create Test' },
  { method: 'GET', path: '/api/labs/tests/{test_id}', name: 'Get Test' },
  { method: 'PATCH', path: '/api/labs/tests/{test_id}', name: 'Update Test' },
  { method: 'DELETE', path: '/api/labs/tests/{test_id}', name: 'Delete Test' },
  { method: 'GET', path: '/api/labs/tests/code/{code}', name: 'Get Test by Code' },
  { method: 'POST', path: '/api/labs/orders', name: 'Create Order' },
  { method: 'GET', path: '/api/labs/orders', name: 'List Orders' },
  { method: 'GET', path: '/api/labs/orders/{order_id}', name: 'Get Order' },
  { method: 'PATCH', path: '/api/labs/orders/{order_id}', name: 'Update Order' },
  { method: 'POST', path: '/api/labs/orders/{order_id}/collect', name: 'Collect Sample' },
  { method: 'PATCH', path: '/api/labs/orders/{order_id}/tests/{test_id}/status', name: 'Update Test Status' },
  { method: 'GET', path: '/api/labs/orders/{order_id}/history', name: 'Get Status History' },
  { method: 'POST', path: '/api/labs/orders/{order_id}/tests/{test_id}/result', name: 'Submit Result' },
  { method: 'GET', path: '/api/labs/orders/{order_id}/results', name: 'Get Results' },
  { method: 'PATCH', path: '/api/labs/results/{result_id}/review', name: 'Review Result' },
  { method: 'GET', path: '/api/labs/stats', name: 'Lab Statistics' },
  { method: 'GET', path: '/api/labs/orders/stats/specialty/{type}', name: 'Specialty Stats' },
]

const endpointResults = await parallel(endpoints.map(ep => () =>
  agent(
    `Test endpoint: ${ep.method} ${ep.path} (${ep.name})
     - Verify endpoint is reachable through gateway
     - Check response format
     - Validate status code (200-204 expected)
     - Note any errors or validation issues`,
    {
      label: `endpoint-${ep.name.toLowerCase().replace(/\\s+/g, '-')}`,
      phase: 'Endpoint Testing',
      schema: {
        type: 'object',
        properties: {
          endpoint: { type: 'string' },
          status: { type: 'string' },
          http_code: { type: 'number' },
          working: { type: 'boolean' },
          notes: { type: 'string' }
        }
      }
    }
  )
))

phase('Integration Testing')
const integrationTests = await agent(
  `Test Lab Service integrations:
   1. Patient Service Integration: Verify order creation validates patient ID through Patient Service
   2. Notification Service: Verify status changes trigger notifications (check if service is called)
   3. Database Relationships: Test foreign key constraints and cascade deletes
   4. State Machine: Verify status transitions follow valid state paths (ordered → sample_collected → in_progress → completed)
   5. Concurrent Operations: Test sample collection idempotency (calling twice returns same sample)

   Return detailed results for each integration point`,
  {
    label: 'integration-tests',
    phase: 'Integration Testing',
    schema: {
      type: 'object',
      properties: {
        patient_validation: { type: 'string' },
        notifications: { type: 'string' },
        database_constraints: { type: 'string' },
        state_machine: { type: 'string' },
        idempotency: { type: 'string' },
        all_passed: { type: 'boolean' }
      }
    }
  }
)

phase('Data Integrity')
const dataIntegrity = await agent(
  `Validate Lab Service data integrity:
   1. Check for orphaned records (orders without patients, results without orders)
   2. Verify audit trail completeness (StatusHistory captures all changes)
   3. Validate normal range constraints on test results
   4. Check abnormal/critical value flagging works correctly
   5. Verify cascade delete behavior (deleting order removes dependent data)
   6. Check for data type mismatches or invalid values in database

   Return: integrity check results, any data anomalies found`,
  {
    label: 'data-integrity',
    phase: 'Data Integrity',
    schema: {
      type: 'object',
      properties: {
        orphaned_records: { type: 'string' },
        audit_trail: { type: 'string' },
        normal_ranges: { type: 'string' },
        result_flagging: { type: 'string' },
        cascade_deletes: { type: 'string' },
        anomalies_found: { type: 'boolean' },
        anomaly_details: { type: 'string' }
      }
    }
  }
)

phase('Report Generation')
const report = await agent(
  `Generate a comprehensive validation report with:

   1. Executive Summary (pass/fail status, issues found)
   2. Service Health Status
   3. Endpoint Test Results (all 19 endpoints)
   4. Integration Test Results
   5. Data Integrity Findings
   6. Issues Found and Severity Levels
   7. Recommendations
   8. Conclusion and Production Readiness

   Format as markdown report suitable for documentation.`,
  {
    label: 'report-generation',
    phase: 'Report Generation',
    schema: {
      type: 'object',
      properties: {
        report: { type: 'string' },
        overall_status: { type: 'string' },
        pass_rate: { type: 'number' },
        critical_issues: { type: 'number' },
        medium_issues: { type: 'number' },
        low_issues: { type: 'number' }
      }
    }
  }
)

log(`Validation complete. Generated report with ${report.critical_issues} critical, ${report.medium_issues} medium, ${report.low_issues} low severity issues.`)

return {
  health: healthCheck,
  endpoints: endpointResults.filter(Boolean),
  integrations: integrationTests,
  data_integrity: dataIntegrity,
  report: report.report,
  summary: {
    status: report.overall_status,
    pass_rate: report.pass_rate,
    critical_issues: report.critical_issues,
    medium_issues: report.medium_issues,
    low_issues: report.low_issues,
    production_ready: report.critical_issues === 0
  }
}
