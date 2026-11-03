# C3 — Component

> Proposed architecture; the complete application has not been built yet.

```mermaid
%%{init: {"flowchart": {"nodeSpacing": 65, "rankSpacing": 70}}}%%
flowchart TB
    web["Web interface<br/><i>[Container]</i>"]
    subgraph backend[" "]
        entry["Request handling and access<br/><i>[Component]</i>"]
        sessions["Sessions and imports<br/><i>[Component]</i>"]
        review["Reviews and records<br/><i>[Component]</i>"]
        reports["Statistics and exports<br/><i>[Component]</i>"]
        store["Storage access<br/><i>[Component]</i>"]
        jobs["Job dispatch<br/><i>[Component]</i>"]
    end
    db[("Database<br/><i>[Container]</i>")]
    files[("File storage<br/><i>[Container]</i>")]
    worker["Matching worker<br/><i>[Container]</i>"]
    web --> entry
    entry --> sessions
    entry --> review
    entry --> reports
    sessions --> store
    review --> store
    reports --> store
    sessions --> jobs
    review --> jobs
    store --> db
    store --> files
    jobs --> worker
    classDef component fill:#1168bd,stroke:#0b4f9e,color:#fff
    classDef external fill:#e2e8f0,stroke:#64748b,color:#0f172a
    class entry,sessions,review,reports,store,jobs component
    class web,worker,db,files external
    style backend fill:#f8fbff,stroke:#1168bd,stroke-dasharray:5 5
```

The dashed box marks the application API boundary. Arrows show which components interact; their responsibilities are described below.

## Component responsibilities

| Component | Proposed responsibility |
| --- | --- |
| Request handling and access | Receives requests and checks input and user permissions. |
| Sessions and imports | Creates sessions, checks files, and manages input data. |
| Reviews and records | Saves decisions, searches records, and handles requests to correct merges. |
| Statistics and exports | Provides statistics and clean files for the requested session. |
| Storage access | Reads and writes data and files for API components. |
| Job dispatch | Sends matching, merging, and CSV rebuilding jobs to the worker. |

## How the components work together

- Requests pass through input and access checks before reaching the relevant feature.
- Features read or write data through storage access.
- Sessions request matching; reviews request processing after a decision or a merge correction. Job dispatch sends work to the separate worker.
- After an incorrect merge is split, the old clean file cannot be downloaded until the replacement is ready.

The diagram describes a proposed design. Job dispatch, storage technologies, and code structure will be determined during implementation.

[C4](README.en.md) · [C2 — Container](02-container.en.md)
