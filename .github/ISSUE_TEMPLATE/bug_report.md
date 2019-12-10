---
name: Bug report
about: Report a defect in the product
title: ''
labels: bug, untriaged
assignees: ''

---

<!--
Github Issues are consistently monitored by F5 staff, but should be considered
as best effort only and you should not expect to receive the same level of
response as provided by F5 Support. Please open a case
(https://support.f5.com/csp/article/K2633) with F5 if this is a critical issue.

When filing an issue please check to see if an issue already exists that matches your's
-->

### Environment
 * Telemetry Streaming Version:
 * BIG-IP Version:

### Summary
A clear and concise description of what the bug is.
Please also include information about the reproducibility and the severity/impact of the issue.

### Steps To Reproduce
Steps to reproduce the behavior:
1. Submit the following declaration:
```json
{
    "class": "Telemetry",
    "poller": {
        "class": "Telemetry_System_Poller",
        "interval": 60
    }
}
```

2. Observe the following error response:
```json
{
    "code": 500,
    "message": "Something went wrong",
    "restOperationId": 23018917,
    "kind": ":resterrorresponse"
}
```

### Expected Behavior
A clear and concise description of what you expected to happen.

### Actual Behavior
A clear and concise description of what actually happens.
Please include any applicable error output.

