# Token Bowl - Kimi K2 Week 3

## System Prompt

# Fantasy-Football Week-Setting Prompt for MCP-Agent  
(Re-written for tool-driven, not endpoint-driven, interaction)

## 1. Establish MCP session  
Connect to the MCP server that fronts your fantasy league.  
Your client already knows the list of available tools—don’t guess their names.  
Use the built-in `list_tools` call (or equivalent) to discover what is offered.  
Keep that list in context; you will map each need below to the closest-matching tool.

------------------------------------------------
## 2. Collect the state of the universe  
You must obtain seven **classes** of information.  
Pick whichever tools give you each class; if none exist, SAY SO and abort rather than invent.

| Class of data | How you will use it |
|---------------|---------------------|
| League rules & roster slots | Know how many players you must start at each position and what scoring system applies. |
| Current week & lock time | Know the deadline after which no lineup changes are allowed. |
| Your full roster | Get every player you own, their positions, bye weeks, and current injury tags. |
| Point projections | Fetch forecasted fantasy points for the upcoming scoring period. |
| News / injury report | Convert tags like “Out”, “Doubtful”, “Questionable” into a go/no-go decision. |
| Opponent strength vs. position | See how generous each player’s upcoming NFL opponent has been to that position. |
| Any already-locked spots | Prevent you from moving players whose games have kicked off. |

Query only the tools that provide the above.  
Cache the returned JSON under human-readable keys (`league_rules`, `proj_map`, etc.).

------------------------------------------------
## 3. Filter & Rank  
For every player you control, build a simple record:  
`{ id, pos, pts, floor, ceil, injury, opp_rank, locked?, bye? }`

**Hard filters**  
- Drop “Out” players.  
- Drop players on a bye.  
- Honor locked slots—do not touch them.

**Scoring slot fill order**  
1. Fill required positions first (QB, RB, WR, TE, D/ST, K).  
2. Then FLEX (RB/WR/TE) using best remaining eligible player.  
3. If super-flex or IDP slots exist, fill them last.

**Tie-breaker stack (apply in order)**  
a. Highest expected points.  
b. Lowest injury risk.  
c. Highest floor when expected points differ by ≤ 1.  
d. Softer opponent rank (lower number = easier matchup).  

------------------------------------------------
## 4. Commit the lineup  
Locate the tool whose description contains phrases like “set starters”, “submit lineup”, or “update roster”.  
Construct its required payload—usually an array mapping slot names to player IDs.  
Call the validation flavour first if one exists; fix any rejected slots and retry (max 3 times).  
On success, log the server’s confirmation token and print a short summary to stdout:


Based on my comprehensive analysis, here are my findings and recommendations for crabasa's team:

## Analysis Summary

### Critical Issues Identified:

1. Joe Burrow is OUT - On IR with season-ending toe injury (Week 15 return)
2. Player ID 4666 is invalid - This appears to be a placeholder/error in the kicker slot
3. D'Andre Swift is QUESTIONABLE - Limited practice with quadriceps injury
4. Tyreek Hill already played - Game is live, he has 15.9 points locked in

### Team Strengths:

• Strong WR corps with Hill, Evans, London, Rice, Pittman, and Flowers
• Elite RB Bijan Robinson
• Good backup QB in Caleb Williams
• Solid bench depth at RB with Chubb and Stevenson

## Recommended Optimal Lineup (Week 3)

Based on projections, injury status, and matchup analysis:

### 🎯 OPTIMAL STARTING LINEUP:

1. **QB:** Caleb Williams (CHI) - 18.1 projected points ✅ Replace injured Burrow
2. **RB:** Bijan Robinson (ATL) - 21.0 projected points ✅ Must start
3. **RB:** Nick Chubb (HOU) - 12.7 projected points ✅ Replace questionable Swift
4. **WR:** Tyreek Hill (MIA) - 15.9 actual points ✅ Already played, locked in
5. **WR:** Drake London (ATL) - 16.6 projected points ✅ Great matchup vs CAR
6. **TE:** Kyle Pitts (ATL) - 10.0 projected points ✅ Solid option
7. **FLEX:** Mike Evans (TB) - 17.0 projected points ✅ High ceiling
8. **FLEX:** Zay Flowers (BAL) - 16.5 projected points ✅ Replace Rice - better matchup
9. **K:** Cairo Santos (CHI) - 6.8 projected points ✅ Pick up from waivers
10. **DEF:** CHI Defense - Keep current defense

### Bench Optimizations:

• Sit D'Andre Swift (questionable quad injury)
• Sit Rashee Rice (lower projection than Flowers)
• Sit Michael Pittman (good but lower ceiling this week)
• Sit Rhamondre Stevenson (solid but Chubb higher upside)

## Key Moves to Make:

1. **Immediate:** Add Cairo Santos (K - CHI) from waivers
2. **If Swift is inactive:** Start Chubb over Swift (already recommended)
3. **Monitor:** Keep an eye on Swift's status for future weeks

## Projected Impact:

• Current projected starters: ~94 points
• Optimized lineup: ~110+ points
• Potential gain: 15+ additional points

This lineup maximizes your scoring potential while minimizing injury risk. The key changes address your critical QB situation and optimize your FLEX spots with the highest-projected available players.