# Sky Bounce Tuning Log

| Change | Before | After | Reason |
|---|---|---|---|
| Camera look-at Z | Overwrote lookahead to `pz - 0.15` | `CAM_LOOKAHEAD` (3.4), slightly more in air | Player could not see the next landing |
| Camera height in air | `+0.38` | Scales with height, cap 2.4 | Bounce apex was off-screen / egg-filled |
| Checkpoint | Silent `checkpointsHit++` | `sfxCheckpoint` + hint + light trauma | Need to feel “I already passed this” |
| Jelly width | 5.6 | 8.4 | So you can run right *on* the pad before launch |
| highA | x=5.5, d=4.4, connect to highB | x=4.6, d=12, overlaps jelly in x/z at y=2 | Center bounce still goes low; right-side bounce lands high |
| highA→highB | gap 0.14 | pounce 6.25 | Jump is unstable, jump→pounce is comfortable |
| highFin chain | one 4.4 pad | 12-deep land + pounce 6.25 | Second pounce spot, same lesson |
| hopB / hopC | both 7.2 | 5.4 commit / 9.2 relief | Middle of the course was two identical islands |

| land1 width | 7.2 | 8.4 | Right-side approach onto jelly was a fall off the 7.2 pad |
| Jelly-right coin | none | x=3.2 on jelly | Tell: go right before the launch |
| forcePlay retry | no-op if already playing | always remount race | Retry / playtest must actually restart |
