# Spike results 2026-10-26T11:07:38.048Z

NVIDIA ids in /models: nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B, nvidia/Nemotron-3_5-Lightning, nvidia/Nemotron-3-Ultra-550b-a55b, nvidia/nemotron-3-super-120b-a12b, nvidia/Nemotron-3.5-Super-VL

| test | model | status | ms | note |
|---|---|---|---|---|
| plain | lightning | 200 | 809 | reasoning=true thinkTag=false content="OK" rl=599/399739 |
| thinking-off | lightning | 200 | 272 | accepted |
| json-schema | lightning | 200 | 1221 | parsed=false |
| json-object | lightning | 200 | 1666 | parsed=false |
| plain | nano | 200 | 2164 | reasoning=true thinkTag=false content="\nOK" rl=99/799739 |
| thinking-off | nano | 200 | 1031 | accepted |
| json-schema | nano | 200 | 7111 | parsed=false |
| json-object | nano | 200 | 2399 | parsed=true |
| plain | super | 200 | 2764 | reasoning=true thinkTag=false content="\n\nOK" rl=299/199738 |
| thinking-off | super | 200 | 625 | accepted |
| json-schema | super | 200 | 1076 | parsed=true |
| json-object | super | 200 | 599 | parsed=true |
| plain | superVL | 200 | 488 | reasoning=true thinkTag=false content="OK" rl=299/1999738 |
| thinking-off | superVL | 200 | 385 | accepted |
| json-schema | superVL | 200 | 824 | parsed=true |
| json-object | superVL | 200 | 750 | parsed=true |
| plain | ultra | 200 | 653 | reasoning=true thinkTag=false content="OK" rl=299/199738 |
| thinking-off | ultra | 200 | 793 | accepted |
| json-schema | ultra | 200 | 1093 | parsed=true |
| json-object | ultra | 200 | 1367 | parsed=true |
| tool-call | super | 200 | 892 | tool_calls=[{"id":"chatcmpl-tool-983094cceaff8f12","function":{"arguments":"{\"tz\": \"Asia/Kolkata\"}","name":"get_time"},"type":" |
| tool-call | ultra | 200 | 720 | tool_calls=[{"id":"chatcmpl-tool-a21e3eb5c213a04f","function":{"arguments":"{\"tz\": \"Asia/Kolkata\"}","name":"get_time"},"type":" |
| vision | superVL | 200 | 981 | content="The image is a solid, uniform grey background." |

## Decisions (copy into .env.local)
```
NV_THINKING_KWARG=on
NV_JSON_MODE=schema
NV_JSON_STRICT=false
```
- thinking-off accepted by 5/5 models
- json-schema parsed by 3/5 models
- json-object parsed by 4/5 models

If any model ID was NOT FOUND above, update src/lib/llm/models.ts defaults and note it in docs/FEEDBACK-LOG.md.
