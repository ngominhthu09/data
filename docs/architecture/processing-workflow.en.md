# Technical processing workflow

[Vietnamese version](./processing-workflow.md)

1. **Create a session:** The Steward provides a name and, optionally, a description. The system assigns a `session_id`. One account may create multiple sessions, each with its own status.
2. **Upload files:** The Steward adds one or more CSV files while the session is `DRAFT` or `READY`. The system rejects non-CSV files. Each file has an `import_batch_id` and `session_id`; the system records its size and source label and reports errors for each file.
3. **Freeze the input:** When the Steward starts processing, the system saves a snapshot of the file list and matching configuration. No further files can be added to that session.
4. **Match records:** The worker reads only data from that session, normalizes it, and applies multiple blocking strategies to generate candidate pairs. Splink scores the pairs; the worker checks for conflicts within each group.
5. **Review results:** The Steward examines likely duplicate groups, selects values for the Golden Record, and approves or rejects each proposal. A resolved group cannot be reviewed again, and a decision cannot rely on stale data.
6. **Merge:** The worker creates or updates masters and source links within the same `session_id`. A source record has at most one active master link; each valid record without a duplicate receives its own master.
7. **Export clean CSV:** After every group is resolved and the merges are verified, the system exports CSV from that session's masters and checks the row count and checksum. The session becomes `COMPLETED` only when the CSV is `READY`.
8. **Process sessions independently:** The Steward may create session B while session A is running or awaiting review. Their results, decisions, and CSV files remain separate. The queue limits concurrent jobs to avoid overload.
9. **After splitting a record:** The system disables downloads of the old CSV, revalidates the Golden Records, and generates a new current CSV. Downloads resume only when the new file is `READY`.

See the [detailed AI matching workflow](./ai-matching-workflow.en.md) for implementation and validation steps.
