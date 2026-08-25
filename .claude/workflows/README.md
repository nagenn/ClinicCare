# Claude Validation Workflows

This folder contains automated validation workflows for the ClinicCare project.

## Available Workflows

### Lab Service Validation (`validation_agent.js`)

Comprehensive automated validation of the Lab Service module including all 19 endpoints, service integrations, and data integrity checks.

**Location:** `.claude/workflows/validation_agent.js`

**How to Run:**

#### Option 1: Using Workflow Command (Recommended)
In Claude Code, use the Workflow tool with the workflow name:
```
Workflow({name: 'lab-service-validation'})
```

#### Option 2: From Claude Code CLI
```bash
claude workflow run lab-service-validation
```

#### Option 3: Direct Reference in Claude Code
Mention in a message: "Run the lab service validation workflow"

## Workflow Phases

1. **Health Check** (5 min)
   - Verifies all services are running
   - Checks database connectivity
   - Validates seed data loaded

2. **Endpoint Testing** (10-15 min)
   - Tests all 19 Lab Service endpoints
   - Validates response formats
   - Checks HTTP status codes
   - Parallel testing for speed

3. **Integration Testing** (5-10 min)
   - Patient Service validation
   - Notification Service integration
   - Database relationship constraints
   - State machine validation
   - Idempotency checks

4. **Data Integrity** (5-10 min)
   - Orphaned record detection
   - Audit trail verification
   - Range constraint validation
   - Cascade delete testing

5. **Report Generation** (2-3 min)
   - Compiles all findings
   - Generates markdown report
   - Produces executive summary
   - Production readiness assessment

**Total Runtime:** ~30-40 minutes for full validation

## Output

The workflow returns:
- **Health Check Results** - Service status overview
- **Endpoint Test Results** - 19 endpoints with individual pass/fail
- **Integration Results** - Cross-service communication validation
- **Data Integrity Report** - Database consistency check
- **Validation Report** - Full markdown documentation
- **Summary** - Pass rate, issue counts, production readiness

## Requirements

Before running the workflow:
1. Start the ClinicCare services:
   ```bash
   docker-compose up
   ```
   Or run services individually on ports 8000-8006

2. Ensure all services are healthy:
   - Lab Service: http://localhost:8006
   - API Gateway: http://localhost:8000
   - Patient Service: http://localhost:8001

## Using Workflow Results

The workflow generates actionable results:
- **Pass Rate** - Overall validation percentage
- **Issue Classification** - Critical, Medium, Low priority issues
- **Production Status** - Ready/Not Ready assessment
- **Recommendations** - Next steps for any failures

## Customization

To modify the validation:
1. Edit `.claude/workflows/validation_agent.js`
2. Add/remove test cases in the endpoints array
3. Modify integration test prompts
4. Adjust data integrity checks
5. Re-run the workflow

## Troubleshooting

**Workflow doesn't run:**
- Verify services are running: `docker-compose ps`
- Check ports 8000-8006 are accessible
- Try running a single service health check first

**Some endpoints fail:**
- Check service logs: `docker-compose logs lab`
- Verify database initialization
- Check Patient Service is running (dependency for orders)

**Integration tests timeout:**
- Services may be slow to respond
- Check system resources
- Try running services individually

## Related Files

- `VALIDATION_REPORT.md` - Previous validation results (template)
- `settings.json` - Permissions for workflow execution
- `CLAUDE.md` - Project architecture and setup guide
