# MereO runtime boundary and rollout

Requested by the owner on 21 September 2026: no MereO runtime requests to Vercel Blob, Vercel or OpenRouter.

## What this change enforces

- Both library-worker entrypoints install a redirect-aware fetch guard. Vercel, Blob, OpenRouter, Upstash and the former Hugging Face hosts are refused before an outgoing request.
- The Ask loop reads R2 through a request-local adapter. Missing objects never fall back to Blob. Existing public EEBO and other legacy R2 files remain usable; restricted PO/Westminster editions are not substituted from the older bucket. Westminster volume 1 remains unavailable.
- Ordinary Ask, the research loop, work sweeps, typed passage judgments, reranking and dictionary gap translation use Cloudflare's AI binding. Old external-backend flags cannot restore an outside provider.
- The existing direct OpenAI query-embedding exception remains because the stored vectors use that embedding space. Its Vercel Gateway and OpenRouter fallback routes are removed.
- The main library worker no longer pulls missing scans from a source host. Runtime /admin/pull imports are disabled. Owner-operated migration scripts are separate from the deployed import graph.
- Every model call is priced separately when provider cost is absent. Tokens from different models no longer inherit the final model's rate.
- Both Wrangler configurations run the egress guard before build/deploy. The older unbundled uploader is retired. The local-preview uploader checks the actual bundle and excludes external-provider bindings.
- sync-site.sh retains the owned generation/judgment adapters and reapplies storage/reranking seams after importing shared research logic.

Typed judgments use the existing schema on the Cloudflare small model. Historical jev* function names are compatibility names; this is not a claim that the external Jev model or its measured quality is running on Cloudflare.

## Deploy backend before theme

Merging the worker repository does not itself deploy the worker. From the worker checkout:

1. Run node scripts/check-tfr-egress.mjs and node --test tfr-library/ask-dev/*.test.mjs.
2. Deploy the main library worker from tfr-library/ using its Wrangler configuration.
3. Deploy the Ask worker from tfr-library/ask-dev/ using its Wrangler configuration.
4. Verify both /v1/runtime-policy endpoints report policy: "cloudflare-only-v1" and externalFallback: false. Run signed-in Ask/Deep smoke tests on those deployments, including a missing-resource case.
5. Merge/deploy the companion Ghost theme change. It routes the former catalogue URLs to /v1/catalogues/, restricts browser egress, and refuses API calls to an old Ask service that does not declare the new policy.

Do not treat a theme-only merge as proof that the old deployed workers have stopped making external calls. Missing R2 content/scans must be migrated separately, preserving public-edition restrictions; do not restore a runtime fallback to make a missing file appear.

## Data and verification

Seventeen public catalogue/index JSON files were copied by the corpus owner into mo-tfr/v1/catalogues/ and verified with a download comparison: 17 matches, zero differences, 40,868,384 bytes. The theme contains their SHA-256 manifest.

The guard traverses 67 runtime modules. Both worker bundles compile. Regression checks cover denied hosts and redirects, R2 misses, concurrent request isolation, old external settings, model failures, truncated answers, reranking, and missing scan requests. No new worker was deployed during this change, and no new live AI answer was generated. Binding availability and answer quality must therefore be checked in step 4 before the theme rollout.

The owner's Vercel application and its full-edition source store were not changed.
