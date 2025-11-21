import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock fetch for local files
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
    if (url.startsWith('/data/') || url.startsWith('./public/data/')) {
        const filePath = path.join(process.cwd(), 'public', url.replace(/^\.?\//, ''));
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return {
                ok: true,
                json: async () => JSON.parse(content)
            };
        } catch (error) {
            console.error(`Error reading local file ${filePath}:`, error);
            return {
                ok: false,
                status: 404,
                statusText: 'Not Found'
            };
        }
    }
    return originalFetch(url, options);
};

// Import API functions
import { getLeagueData, getMatchups } from '../src/sleeperApi.js';
import { enrichPlayerData } from '../src/utils/playerService.js';
import { getTeamInfo } from '../src/teamMappings.js';

async function generateStaticData() {
    console.log('🚀 Starting static data generation...');

    try {
        // 1. Get League Data to find current week
        console.log('📊 Fetching league data...');
        const { league, rosters, users } = await getLeagueData();

        // Determine current week (leg)
        // If season is over, use 18 (or max weeks)
        const currentWeek = league.settings.leg || 1;
        console.log(`📅 Current Week: ${currentWeek}`);

        // We want to generate data for all COMPLETED weeks (1 to currentWeek - 1)
        // If it's week 1, there are no completed weeks.
        const completedWeeks = [];
        for (let i = 1; i < currentWeek; i++) {
            completedWeeks.push(i);
        }

        if (completedWeeks.length === 0) {
            console.log('⚠️ No completed weeks to generate.');
            // Write empty object or basic structure
            writeOutput({});
            return;
        }

        console.log(`Processing weeks: ${completedWeeks.join(', ')}`);

        // Prepare data structure
        const staticData = {
            generatedAt: new Date().toISOString(),
            currentWeek,
            weeks: {}
        };

        // Build roster map for easy lookup
        const rosterMap = {};
        rosters.forEach(roster => {
            rosterMap[roster.roster_id] = roster;
        });

        // 2. Process each completed week
        for (const week of completedWeeks) {
            console.log(`\n📦 Processing Week ${week}...`);

            // Fetch matchups
            const matchups = await getMatchups(week);

            // Process matchups (logic adapted from league.js loadWeekData)
            const matchupGroups = {};
            const weekRosterData = {};
            const weekPlayerStats = {};

            // We need to fetch all players first to enrich them efficiently?
            // enrichPlayerData handles fetching missing players.

            // Process each matchup
            for (const matchup of matchups) {
                // Enrich player data
                let enrichedPlayers = null;
                if (matchup.players_points) {
                    enrichedPlayers = await enrichPlayerData(matchup.players_points, {}); // Pass empty existingPlayers to force fetch/cache usage
                }

                // Calculate bench players
                const benchPlayers = matchup.players ?
                    matchup.players.filter(playerId => !matchup.starters?.includes(playerId)) : [];

                // Build player stats
                if (matchup.players) {
                    matchup.players.forEach(playerId => {
                        const points = matchup.players_points?.[playerId] || 0;
                        const isStarter = matchup.starters?.includes(playerId) || false;

                        weekPlayerStats[playerId] = {
                            playerId,
                            rosterId: matchup.roster_id,
                            points,
                            started: isStarter,
                            benched: !isStarter,
                            week
                        };
                    });
                }

                // Store roster data
                if (matchup.roster_id) {
                    const baseRoster = rosterMap[matchup.roster_id];
                    const user = baseRoster?.user;
                    const teamInfo = user?.display_name ? getTeamInfo(user.display_name) : null;

                    weekRosterData[matchup.roster_id] = {
                        roster_id: matchup.roster_id,
                        owner_id: baseRoster?.owner_id || null,
                        user: user || null,
                        teamInfo: teamInfo,
                        settings: baseRoster?.settings || {},
                        players: matchup.players || [],
                        starters: matchup.starters || [],
                        bench: benchPlayers,
                        taxi: baseRoster?.taxi || [],
                        reserve: baseRoster?.reserve || [],
                        players_points: matchup.players_points || {},
                        points: matchup.points || 0,
                        week: week,
                        matchup_id: matchup.matchup_id || null
                    };
                }

                if (!matchupGroups[matchup.matchup_id]) {
                    matchupGroups[matchup.matchup_id] = [];
                }
                matchupGroups[matchup.matchup_id].push({
                    ...matchup,
                    roster: rosterMap[matchup.roster_id],
                    bench: benchPlayers,
                    enrichedPlayers
                });
            }

            // Store in static data
            staticData.weeks[week] = {
                weekRosters: weekRosterData,
                playerStats: weekPlayerStats,
                matchups: Object.values(matchupGroups)
            };

            console.log(`✅ Week ${week} processed.`);
        }

        // 3. Write to file
        writeOutput(staticData);
        console.log('🎉 Static data generation complete!');

    } catch (error) {
        console.error('❌ Error generating static data:', error);
        process.exit(1);
    }
}

function writeOutput(data) {
    const outputPath = path.join(process.cwd(), 'public', 'data', 'completed-weeks.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`💾 Data written to ${outputPath}`);
}

generateStaticData();
