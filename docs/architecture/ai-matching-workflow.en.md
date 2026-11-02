# Detailed AI matching workflow design

[Vietnamese version](./ai-matching-workflow.md)

This is a **proposed design**, not an implemented feature. It aims to find customer records that may refer to the same person **within one session**, present evidence to a Steward, and merge and export only after review. AI/ML scores and proposes matches; the Steward decides whether to merge. Score thresholds, blocking rules, and comparison fields must be calibrated against sample data before they are finalized.

## Inputs, outputs, and session boundary

- **Input:** One or more accepted CSV files in a session. Each row has an internal `source_records.id`, `import_batch_id`, `row_number`, raw data, and normalized data. A customer ID found in a CSV is reference data, not the system's unique ID.
- **AI output:** Candidate pairs in `match_candidates` (scores and evidence) and likely duplicate groups in `match_groups`/`group_members`. These are proposals, not merged records.
- **Output after review:** `review_decisions`, `master_records`, `master_links`, and one current clean CSV in `clean_exports`.
- **Required boundary:** Check `session_id` for every query, comparison pair, group, decision, and record. Match files **within** the same session, including across different files; never mix two sessions.

## Processing steps

| Step | Implementation approach | Result / gate |
| --- | --- | --- |
| **1. Accept and validate CSV** | `ImportService` accepts CSV only, checks required columns, and reads rows. Attach each file to its session; retain raw and normalized data and errors by file, row, and column. Exclude invalid rows from matching. | Each file has valid/error counts. A session needs at least one valid file before it can start. |
| **2. Freeze the input** | When the Steward starts a run, freeze the `import_batch_id` list in `input_snapshot`, create a `QUEUED` `match_jobs` record, and dispatch a worker. The worker receives `session_id` and reads exactly the files listed in the snapshot. | The job has a fixed input set; files cannot be added or removed during the run. |
| **3. Normalize fields** | Preserve original values and create comparison fields: Unicode/whitespace normalization and tokens for names; cleaned email; phone normalization under configured country rules; normalized whitespace, abbreviations, and address components. Two missing values are not positive match evidence. | Consistent comparison data that still traces back to the original CSV. Normalization rules are versioned. |
| **4. Generate candidate pairs (blocking)** | Union several candidate sets **within the session**, such as valid exact phone, valid exact email, or a combination of name tokens and address components. Deduplicate pairs and never compare a row with itself. Count comparisons per rule before executing to avoid an explosive pair count. | A tractable candidate set with pair counts and reduction relative to all-pairs comparison. |
| **5. Score with Splink** | `ProbabilisticMatcher` compares name, phone, email, and address at appropriate similarity levels; it records a score/probability and field-level contributions. Each job uses a versioned model configuration. Train or calibrate with labeled data or a separate parameter-estimation process; do not retrain automatically after each decision. | `match_candidates` stores two internal row IDs, probability, and evidence; `match_jobs` stores the model version and threshold configuration. The review threshold must be validated and is not fixed in this design. |
| **6. Group and validate conflicts** | Connect pairs above the review threshold into candidate groups. `GroupValidator` flags weak transitive links and clear conflicts, such as contradictory identity fields within a group. Show conflicting groups for member-by-member Steward review; do not infer that A matches C only because A–B and B–C score highly. | Session-scoped `match_groups`/`group_members` proposals with `PENDING` status. |
| **7. Present evidence** | P06 lists groups, scores, and states. P07 shows original records side by side, matching/different fields, pair scores, conflicts, and file origins. The Steward chooses values and their sources for a proposed Golden Record. | The reviewer sees interpretable evidence, not just a probability. |
| **8. Steward review** | The Steward approves or rejects each `PENDING` group. The backend checks authorization, `session_id`, data version, and a group lock before writing `review_decisions`; stale or concurrent requests return `409`. Rejection creates no merge link. | Each group has one effective decision, including reviewer, time, reason, and selected values. |
| **9. Controlled merge** | For an approved group, `GoldenRecordService` creates/updates the master and `master_links` in one transaction. Recheck that all records share the session and that each source has at most one `ACTIVE` link. Valid nonduplicate records also get their own masters. Record transaction failures so retries are safe. | A Golden Record traceable to original rows. AI scores never trigger an automatic merge. |
| **10. Export clean CSV** | After every group is resolved and merges are valid, `CleanExportService` reads only that session's masters, writes one row per customer, checks row count/checksum, and publishes a `READY` file. The CSV uses UTF-8 and the columns listed in the README. | The session becomes `COMPLETED`; only a Steward can download its current CSV. |
| **11. Correct a mistaken merge** | When a Steward splits a record, revoke incorrect links and rebuild the master from original data. Disable old CSV downloads, move the session to `REVALIDATING`, generate a new CSV, and allow downloads only when it is `READY`. | Original records, decision history, and session boundaries remain intact. |

## Prepare and freeze the Splink model

1. Use sample data to define comparison fields and similarity levels (exact, approximate, missing) for name, phone, email, and address. Apply the same normalization rules during calibration and job execution.
2. Estimate parameters on a separate training dataset. Splink supports random-pair sampling and EM estimation with suitable training blocking rules. Count the pairs generated by each rule first to bound time and memory.
3. Use a labeled pair set **held out from training** to measure precision/recall and choose the threshold for Steward review. Check transitive groups and false merges separately.
4. Version the approved model and configuration. Each `match_jobs` row records `model_version`, `normalization_version`, and `matching_config`; the worker uses that version throughout the job. Steward decisions may provide labels for later calibration, but do not change an in-progress job's model.

## Responsibilities of AI, rules, and people

| Component | Responsibility |
| --- | --- |
| **Splink/ML** | Estimate whether two rows describe the same customer; produce scores and field-level evidence. |
| **Processing rules** | Validate CSV, normalize data, block candidate pairs, detect conflicts, check authorization and session scope, write transactions, and export CSV. |
| **Steward** | Review evidence, select Golden Record values, approve or reject merges, and undo mistaken merges. |
| **LangGraph (optional)** | Orchestrate job states and the pause for Steward review; a queue and state machine may replace it. |
| **Embeddings/LLM (optional)** | Add evidence for difficult cases under a configured cost limit. They do not decide merges and are not invoked for every pair. |

## Validation before broader use

1. Prepare sample CSVs with matching and nonmatching pairs, missing values, typos, conflicts, and multiple files in one session. Label a pair set for quality measurement.
2. Measure candidate counts for each blocking rule, true-match coverage, time, and RAM/CPU at 10k, 100k, and 1m rows. Publish no unmeasured capacity claims.
3. Evaluate pair- and group-level precision/recall, especially false merges. Tune thresholds on labeled data; retain every threshold and model version with its job.
4. Test concurrent sessions, invalid files/rows, simultaneous review requests, retries, record splits, and CSV downloads after an old export has been invalidated.

**Technical note:** Splink requires a unique row ID and supports blocking, parameter estimation, pair prediction, and threshold-based clustering. Connected-component clustering can create transitive chains, so Unira's conflict check above is an additional design decision. See the official [Splink settings guide](https://github.com/moj-analytical-services/splink/blob/master/docs/api_docs/settings_dict_guide.md), [training blocking guide](https://moj-analytical-services.github.io/splink/topic_guides/blocking/model_training.html), [inference API](https://moj-analytical-services.github.io/splink/api_docs/inference.html), and [clustering API](https://moj-analytical-services.github.io/splink/api_docs/clustering.html).
