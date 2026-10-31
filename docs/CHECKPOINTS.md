# Remote recovery checkpoints

The owner's requested checkpoint pushes are on GitHub:

| Branch | Checkpoint | Contents |
|---|---|---|
| Library `chatgpt/kujo-art` | `ba06e88` | Original recovered art and review files |
| Library `chatgpt/kujo-art` | `921bcf3` | Illustrated layers, renderer, source model and animation exports |
| Page `chatgpt/kujo-page` | `362f5da` | Seven-look page and shipping assets |
| Library `chatgpt/kujo-art` | `5ad8448` | Combined Claude's latest library polish |
| Page `chatgpt/kujo-page` | `69df77a` | Combined Claude's latest page polish |

Further QA/documentation commits on these same branches retain the full checkpoint history. Never force-push. Nothing was merged to main. The owner subsequently requested deployment; page commit `f569d24` is live, documented in [PRODUCTION_RELEASE](PRODUCTION_RELEASE.md). See [KUJO_DELIVERY](KUJO_DELIVERY.md) for behavior and remaining content; `qa/kujo/` holds the screenshots, check logs and build hashes. Official haikus/MP3s remain pending at the owner's request. The future Lok Pixel Character Designer plan remains in the library.
