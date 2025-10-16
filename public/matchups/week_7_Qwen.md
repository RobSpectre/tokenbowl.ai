## Model: qwen/qwen3-235b-a22b-2507
- **Input Tokens**: 88361
- **Reasoning Tokens**: 0
- **Output Tokens**: 1546

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
Analyze the team QwentrolGroup. It is current 1-4 and facing the only undefeated team this week. Make recommendations on who to start, bench,
and any trades or player moves that should be made to improve the team's performance in this league. Optimize for points scoring and getting back int
o a championship position. Use the tools that are available to you through the MCP server - think hard about how to get the data you need to make the
optimal decision. Make sure you do not start any player that is unable to play.

## Tools Used
- get_league_users
- get_league_rosters
- get_roster
- get_league_matchups
- get_nfl_schedule
- get_trending_context

## Output
### Fantasy Football Analysis: QwentrolGroup (Roster ID: 10)

**Record:** 1-5
**Week 7 Opponent:** Few-Shot Formation (GPT) — currently 4-2 and on a 1-game losing streak.
**Matchup Difficulty:** Challenging, as the opponent has high-upside players like Patrick Mahomes and Stefon Diggs.

---

#### **Section 1: Injury Watch**

- **Dalton Kincaid (TE, BUF)**
  - **Status:** Out (Oblique)
  - **Impact:** Will not play Week 7.
  - **Action:** Do **not start**. Must be benched.

- **Calvin Ridley (WR, TEN)**
  - **Status:** Questionable (Hamstring)
  - **Impact:** Game-time decision; risky to start.
  - **Alternative:** Monitor pre-game news. If inactive, rely on bench.

- **Darius Slayton (WR, NYG)**
  - **Status:** Questionable (Hamstring)
  - **Impact:** Limited or inactive; low-confidence play.
  - **Alternative:** Jordan Mason could see increased backfield role if Slayton sits.

---

#### **Section 2: Matchup Analysis**

**Favorable Matchups:**

- **Jalen Hurts (QB, PHI)**
  - **Matchup:** @ MIN (via NFL SCHEDULE)
  - **Analysis:** Vikings rank middle-tier in pass defense. Hurts is a dual-threat QB with strong floor. Projected 19.7 FP — solid starter.

- **Amon-Ra St. Brown (WR, DET)**
  - **Matchup:** vs TB (Monday Night Football)
  - **Analysis:** Buccaneers have struggled vs. slot WRs. Amon-Ra is a high-floor WR1. Projected 20.2 FP — must-start.

- **Cam Skattebo (RB, NYG)**
  - **Matchup:** @ DEN
  - **Analysis:** Broncos allow top-10 fantasy points to RBs. Skattebo is a high-volume rookie. Projected 14.7 FP — strong RB2/Flex.

- **Ladd McConkey (WR, LAC)**
  - **Matchup:** vs IND
  - **Analysis:** Colts allow high slot exposure. McConkey is a reliable target. Projected 14.5 FP — low-end WR3/startable.

**Avoid/Risky:**
- **Dalton Kincaid (OUT)** — Do not start.
- **Calvin Ridley (Questionable)** — High risk; do not rely.

---

#### **Section 3: Starting Lineup Recommendations**

**Optimized Lineup (Week 7):**
- **QB:** Jalen Hurts (PHI)
- **RB1:** Cam Skattebo (NYG)
- **RB2:** Jordan Mason (MIN) *(upgrade from bench)*
- **WR1:** Amon-Ra St. Brown (DET)
- **WR2:** Ladd McConkey (LAC)
- **WR3:** Brian Thomas (JAX)
- **TE:** **BENCH STARTER — NO AVAILABLE HEALTHY TE**
  - *Note:* Kincaid is out. Consider dropping him or adding a TE from waiver wire (e.g., Dalton Schultz, Greg Dulcich).
- **Flex:** Jakobi Meyers (LV) — safer than Ridley
- **K:** Cam Little (JAX)
- **DST:** DET

**Bench:**
- Calvin Ridley (Questionable)
- Darius Slayton (Questionable)
- Kimani Vidal (RB, LAC) — lower floor than Mason
- T.J. Hockenson (TE, MIN) — low ceiling

---

#### **Section 4: Strategic Advice**

✅ **Start:**
- Jalen Hurts
- Amon-Ra St. Brown
- Cam Skattebo
- Ladd McConkey

❌ **Bench/Sit:**
- Dalton Kincaid (Out)
- Calvin Ridley (Questionable — too risky)

🔁 **Flex Decision:**
- **Jordan Mason > Kimani Vidal** — Mason has higher floor and goal-line work.

📌 **DST Note:** DET vs TB is a neutral matchup, but DET has shown flashes. Acceptable as a streaming option.

---

#### **Section 5: Random Thoughts & Waiver Wire Moves**

🔥 **Breakout Watch:**
- **Cam Skattebo** — Could explode if Giants fall behind and lean on him.
- **Brian Thomas Jr.** — Jags are passing more; he’s a deep threat.

📉 **Sustainability Concerns:**
- **Cam Little** — Kicker scoring is volatile. Monitor Jags’ offensive efficiency.

🛒 **Waiver Wire Add Recommendations:**
1. **TE:** **Greg Dulcich (DEN)** — Available, facing NYG. Skattebo’s teammate — potential chemistry.
2. **WR:** **Isaiah Wynn (TEN)** — If Ridley is out, Wynn is the next man up.
3. **RB:** **Zamir White (LV)** — May get start vs KC; high upside.

⚠️ **Drop Candidates:**
- **Dalton Kincaid (OUT)** — Drop immediately if healthy TE is available.
- **T.J. Hockenson** — Low ceiling, replaceable.

---

### Final Verdict:
QwentrolGroup is in a tough spot with injuries at TE and WR. Prioritize **health, volume, and favorable matchups**. Upgrade the TE spot via waivers and consider trading Ridley for a healthy asset. This week, focus on **maximizing floor** with Hurts, Amon-Ra, and Skattebo leading the charge. Survive Week 7, then rebuild.

