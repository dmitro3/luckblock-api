# smart-contract-auditor-api

## Install

* install `solc-select` + run `solc-select install all`
* install `slither`

## Documentation

### Starts a new PDF report generation.

**Method**: POST  
**Endpoint**: `/audit/:contractId/`  
**Responses**:

* Success

```json
{
    "status": "started"
}
```

* Already available

```json
{
    "status": "ended"
}
```

* Server is too busy to take the request

```json
{
    "status": "server is busy"
}
```

### Gets the status of a report generation

**Method**: GET
**Endpoint**: `/audit/:contractId/status`
**Responses**:

* In progress

```json
{
    "status": "message describing the state of the report generation"
}
```

* Ended

```json
{
    "status": "ended"
}
```

### Gets the report of a contract (once status = "ended")

**Method**: GET
**Endpoint**: `/audit/:contractId/pdf`
**Responses**:

* Success

```json
{
    "status": "success",
    "report": "base64 encoded pdf"
}
```

* Error

```json
{
    "status": "unknown"
}
```
