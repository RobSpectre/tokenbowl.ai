## Model: qwen/qwen3-235b-a22b-2507
- **Input Tokens**: 122351
- **Reasoning Tokens**: 0
- **Output Tokens**: 1432

## System Prompt
### **Fantasy Football Analyst Prompt**

**Objective:**  
Analyze current NFL player news, matchups, and performance trends to provide expert insights for fantasy football managers. The goal is to:


1. Make picks for manager Few_Shot in the league 1266471057523490816.
1. Identify potential injuries and their impact on player availability and performance.
2. Evaluate upcoming matchups to predict which players are likely to have big games.
3. Assemble a competitive lineup for the week that balances risk and upside.
4. Offer strategic advice on whether to start or bench key players based on the matchups.

---

### **Key Considerations**

#### **1. Injury Analysis**
- Check recent injury updates and trendlines for each player.
- Assess the severity of injuries and expected recovery timelines.
- Evaluate if a substitution or replacement is feasible due to injury.
- Consider the impact of injuries on team dynamics and playcalling.

#### **2. Matchup Analysis**
- Review upcoming games and assess defensive rankings.
- Identify favorable matchups (e.g., low-ranked defenses, divisional conflicts).
- Consider home-field advantages and weather conditions.
- Look for game剧本 (expected offensive/defensive strategies) to predict fantasy output.

#### **3. Player Performance Trends**
- Analyze recent performance (past 2–4 weeks) and career averages.
- Identify players in a火热 or slump and adjust expectations accordingly.
- Evaluate players with temporary changes in role or team dynamics.

#### **4. Championship Team Construction**
- Balance the lineup across all positions (QB, RB, WR, TE, Flex, K, DST).
- Prioritize high-floor, low-risk players for consistency.
- Have at least one low-cost, high-upside player ("breakout candidates").
- Consider stacking (e.g., a quarterback with his top receivers).

---

### **Output Structure**

#### **Section 1: Injury Watch**
- **Players to Monitor:** List key players with minor injuries or recent setbacks.
- **Injury Impact:** Describe how injuries could affect their gameplay (e.g., limited snaps, questionable status).
- **Alternative Options:** If a player is questionable, recommend backups or replacements.

**Example:**
- **Player:** Joe Mixon (TB)
- **Status:** Questionable (hamstring injury)
- **Impact:** May limit his carrying workload.
- **Alternative:** Raheem Mostert as a replacement.

#### **Section 2: Matchup Analysis**
- **Players with Favorable Matchups:** Highlight players facing weak defenses or favorable game setups.
- **Players Facing Tough Matchups:** Warn about players facing high-tier defenses or challenging conditions.
- **Key Trends:** Include any significant statistical anomalies or defensive changes.

**Example:**
- **Favorable:** Jalen Ramsey (ARZ) facing a run-heavy Cardinals defense.
- **Tough:** Tyreek Hill (KC) facing a stingy Chiefs defense.

#### **Section 3: Starting Lineup Recommendations**
- Provide a suggested lineup motivated by injuries, matchups, and recent performance.
- Include a "flex" position recommendation.
- Offer depth chart considerations (bench players and couch choices).

**Example:**
- QB: Josh Allen (BUF)
- RB1: Derrick Henry (TEN)
- RB2: Austin Ekeler (LAC)
- WR1: CeeDee Lamb (DAL)
- WR2: Calvin Ridley (ATL)
- TE: Tyler Higbee (NYG)
- Flex: Celonta Lasting (NE)
- K: Justin Tucker (BAL)
- DST: Denver Broncos (D)

#### **Section 4: Strategic Advice**
- Offer starting/bench decisions based on matchups.
- Discuss players with "start 'em or sit 'em" possibilities.
- Address lineup trade-offs (e.g., starting a high-floor QB over a highly volatile wide receiver).

**Example:**
- **Start:** JuJu Smith-Schuster (PIT) facing Detroit Lions.
- **Sit:** Ja'Marr Chase (CIN) facing Baltimore Ravens.

#### **Section 5: Random Thoughts**
- Mention any under-the-radar players with potential for a breakout game.
- Warn about players whose recent success might be unsustainable.
- Discuss any significant betting trends or expert consensus.

---

### **Final Deliverable**

Provide a **concise and actionable analysis** for the current week, with clear recommendations and reasoning. Ensure the content is data-driven, actionable, and tailored to help fantasy managers make informed decisions.


## User Prompt
Analyze the team QwentrolGroup. Make recommendations on who to start, bench, and any trades or player moves that should be made to improve the team's performance in this league. Optimize for points scoring and getting back int o a championship position. Use the tools that are available to you through the MCP server - think hard about how to get the data you need to make the optimal decision. Make sure you do not start any player that is unable to play. When you select a player to add, indicate which player to drop. DO NOT SIT A PLAYER WITH A BYE - MAKE SURE YOU SHOW WHO SHOULD START. Also do not waste time thinking about trades - we are past the trade deadline.

## Tools Used
- get_league_info
- get_league_rosters
- get_league_users
- get_roster
- get_nfl_schedule
- get_player_by_sleeper_id
- get_trending_context

## Output
### Fantasy Football Analyst Report: QwentrolGroup (Qwen)

#### **Section 1: Injury Watch**
- **Amon-Ra St. Brown (DET, WR):** Questionable (Ankle) – Did not practice Tuesday. Monitor Thursday/Friday for practice participation. Risky start; downgrade from high-end WR2.
- **Dalton Kincaid (BUF, TE):** Questionable (Hamstring) – Limited in practice. Uncertain role if active. High risk.

**Impact:** Both key offensive players with questionable status. If either plays, expect limited snap count or suppressed performance.

**Alternative Options:**
- If St. Brown is out: Promote **Ladd McConkey (LAC, WR)** as WR3.
- If Kincaid is out: Start **Brenton Strange (JAX, TE)** — trending as a red-zone threat.

---

#### **Section 2: Matchup Analysis**

**Favorable Matchups:**
- **Jalen Hurts (PHI) @ LAC (Sun, ABC):** Chargers rank bottom-10 in fantasy points allowed to QBs. Hurts is dual-threat with upside for 25+ points.
- **Josh Downs (IND) @ JAC:** Jaguars allow top-8 fantasy points to WRs. Soft spot for volume-based producers.
- **JAX Defense vs IND:** Colts rank bottom-5 in offensive efficiency. JAX D has upside for sacks, turnovers.
- **Ladd McConkey / Kimani Vidal (LAC) vs PHI:** Eagles allow top-6 fantasy points to WRs/RBs. LAC may lean on passing game if trailing.

**Tough Matchups:**
- **Amon-Ra St. Brown (DET) vs DAL:** Cowboys rank top-8 vs WRs. Even if healthy, low ceiling.
- **Bhayshul Tuten (JAX) vs IND:** Colts allow few RB touches inside 10-yard line. TD-dependent.

**Game Script Notes:**
- **PHI @ LAC:** Potential shootout (over/under ~50). Favor pass catchers.
- **IND @ JAC:** JAC may control clock, but Indy’s weak O-line helps JAX D.

---

#### **Section 3: Starting Lineup Recommendations**

**Starters (Week 14):**
- **QB:** Jalen Hurts (PHI) – elite dual-threat vs soft Chargers D.
- **RB1:** Kimani Vidal (LAC) – emerging role, positive usage trend.
- **RB2:** Bhayshul Tuten (JAX) – volume RB, but TD-dependent.
- **WR1:** Ladd McConkey (LAC) – safer than injured St. Brown, favorable matchup.
- **WR2:** Josh Downs (IND) – great spot vs JAC, consistent target share.
- **WR3:** Jakobi Meyers (JAX) – volume receiver, red-zone role.
- **TE:** Brenton Strange (JAX) – upgrade over Kincaid; red-zone usage.
- **FLEX:** Amon-Ra St. Brown (DET) – **only if active**. Otherwise, start **Ladd McConkey** in FLEX (move McConkey from WR1).
- **K:** Jake Bates (DET) – favorable spot vs DAL, but low ceiling.
- **D/ST:** JAX Defense – elite matchup vs struggling Colts.

**Roster Moves:**
- **Add:** None — all key players are rostered.
- **Drop:** **Dalton Kincaid (BUF, TE)** — questionable status, low expected return. Replace with **T.J. Hockenson (MIN)** or **Greg Dulcich (DEN)** off waiver wire if needed.

**Note:** **Chuba Hubbard (CAR, RB)** and **Isaiah Davis (NYJ, RB)** are on bye this week — do **not** start.

---

#### **Section 4: Strategic Advice**

**Start:**
- **Jalen Hurts:** Must-start QB.
- **Ladd McConkey:** Upgrade over St. Brown if injured.
- **JAX D:** Excellent matchup.

**Sit:**
- **Dalton Kincaid:** High injury risk, poor outlook. Drop him.
- **Amon-Ra St. Brown:** Only start if confirmed active Friday/Saturday. Otherwise, bench for McConkey.

**Trade Note:** Trade deadline has passed — focus on lineup optimization and waiver adds.

---

#### **Section 5: Random Thoughts**
- **Kimani Vidal** and **Ladd McConkey** are trending due to increased usage — potential breakout candidates.
- **Brenton Strange** is a sneaky TE streamer with red-zone role.
- **Jalen Hurts** has massive upside in a high-scoring game environment.
- Avoid **Chuba Hubbard** and **Joshua Dobbs** — both on bye (Week 14).

**Final Tip:** Monitor injury reports Thursday/Friday. If St. Brown is ruled out, adjust WR/FLEX accordingly. Prioritize health and matchups over loyalty.


================================================================================
