# Sales assistant knowledge base

Everything the sales assistant knows about Engaging.io's work. It is published to Cloudflare R2 separately from
the code: a merge to `main` that changes this folder goes live within a minute or two, with no deploy.

| Path                       | What it is                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `instructions.md`          | The system prompt: scope, naming and grounding rules, answer format, contact lines             |
| `case-studies/<slug>.md`   | One case study per file: YAML frontmatter, then the write-up in markdown                       |
| `case-studies/_unmatched/` | Documents from the old knowledge base with no index record. Never uploaded; kept for reference |
| `never-disclose.txt`       | Names that must never appear in anything uploaded. One per line, `#` starts a comment          |

The build (`pnpm kb:build`) turns these into one bundle: `instructions.md` as it is, and `prompt.md`, which holds
a generated case study index (`<case_study_index>`) followed by every uploadable case study
(`<case_study_documents>`). There is no hand-written index or URL list any more: both come from the frontmatter.

## Add or edit a case study

1. Copy an existing file in `case-studies/` with the same status, and name it after the client in lowercase
   with hyphens (for an anonymous client, after the descriptor). The file name is the slug: it must be unique.
2. Fill in the frontmatter:

   ```yaml
   ---
   client: 'Acme Retail' # the real name; for anonymous clients this never leaves the repo
   display_name: 'Acme Retail' # what the assistant calls them (the generic descriptor if anonymous)
   status: published # see the table below
   url: 'https://www.engaging.io/case-studies/…' # or null; required for published
   industry: ['Retail', 'Ecommerce']
   region: ['AUS']
   hubs: ['Marketing Hub Enterprise', 'Operations Hub Professional']
   migration_from: ['Salesforce'] # prior platforms; [] for a fresh implementation
   updated: 2026-11-18 # date of your last review
   ---
   ```

   Strings may be quoted or plain; lists use `[a, b]` or one `- item` per line.

3. Write the body in markdown. **The first paragraph is the summary** that goes into the index, so make it two or
   three sentences on the problem, what was built and the result. Then add whatever depth helps: tech stack,
   challenge, solution, results. An award goes in the summary as "Award won: …" and only when it was won.
4. Copy the `url` from the live page on www.engaging.io, character for character. The chat page only makes
   links clickable when they are a `url` in the knowledge base.
5. Run `./cli.sh kb-check` (or `docker compose exec -T app pnpm kb:check`) and fix every error, then open a pull
   request. CI runs the same check.

## Statuses

| Status           | Uploaded | How the assistant treats it                                                                                                            |
| ---------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `published`      | Yes      | Nameable, with a public page. `url` must start with `https://www.engaging.io/`                                                         |
| `anonymous`      | Yes      | The client asked not to be named. Only `display_name` is uploaded; the real name in `client` stays in the repo                         |
| `reference`      | Yes      | Nameable, approved for reference, no public page (`url: null`)                                                                         |
| `draft`          | Yes      | Written up but not client approved. The build removes Results, Impact, Outcomes, metrics and testimonials sections and every `>` quote |
| `excluded`       | No       | Kept for the record only. The assistant knows nothing about it                                                                         |
| `never_disclose` | No       | Like excluded, and the client name is also checked for everywhere else: it may not appear in any uploaded file                         |

## What the check enforces

`pnpm kb:check` fails (and the build refuses to run) when:

- a file's frontmatter is missing or invalid, or a `published` file has no www.engaging.io `url`
- two files share a slug
- a name from `never-disclose.txt`, the `client` of a `never_disclose` file, or the real `client` name of an
  `anonymous` file appears in `instructions.md` or in any uploaded case study, including its file name (the
  slug is uploaded as the document name). Matching ignores letter case and accents, and accepts the words of a
  name run together or joined by hyphens, underscores, dots, slashes, markdown emphasis or "&"/"and"
  ("HardRock", "hard-rock", "**Hard** Rock" all match "Hard Rock"), but only as whole words. The `url` values
  are not scanned: they are the client-approved public pages, so a restricted word in a page address (such as
  "grand-prix") is allowed there and nowhere else. Write-ups copied from debriefs often name the client, or
  give it away with venues, events or dates: replace those with generic descriptions
- Google Docs escapes are left in the text (`\*`, `https\:`)
- the bundle is over 180,000 tokens (estimated as characters ÷ 3.5); over 120,000 it only warns

When a client asks to be anonymised, change the file to `anonymous`, set `display_name` to a descriptor, keep the
real name in `client`, add any other names they go by (brands, abbreviations) to `never-disclose.txt`, and run the
check until it passes.

## Publish

Merging to `main` publishes automatically (`.github/workflows/kb.yml`, once deploys are turned on). By hand:
`./cli.sh kb-publish`. Both run `scripts/kb/publish.sh`, which:

1. builds the bundle into `dist/kb/<version>/` (the version is a hash of its content, so an unchanged knowledge
   base keeps its version)
2. uploads it to the R2 bucket `cloudie-kb` under `kb/<version>/`
3. sets `kbVersion` in the assistant's KV config, leaving the model and other settings as they are

The assistant reads its config at most a minute later and loads the new version. `/api/health` shows the
version in use.

## Roll back

Every published version stays in R2. Run `./cli.sh ai-config`, set `kbVersion` to the earlier version (the
version printed by that publish, or the short hash in the CI log) and save. To make the rollback permanent,
revert the change in Git as well, otherwise the next merge publishes it again.
