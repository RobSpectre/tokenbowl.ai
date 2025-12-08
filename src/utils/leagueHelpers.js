
/**
 * Calculate record through a specific week
 * @param {Object} allMatchups - Map of week number to array of matchups
 * @param {String} rosterId - Roster ID to calculate record for
 * @param {Number} throughWeek - Calculate record up to this week
 * @returns {Object} { wins, losses, ties }
 */
export const getRecordThroughWeek = (allMatchups, rosterId, throughWeek) => {
    let wins = 0
    let losses = 0
    let ties = 0

    for (let week = 1; week <= throughWeek; week++) {
        const weekMatchups = allMatchups[week]
        if (!weekMatchups) continue

        for (const matchup of weekMatchups) {
            if (matchup.length !== 2) continue

            const team1 = matchup[0]
            const team2 = matchup[1]

            // Check if this roster is in this matchup
            if (team1.roster_id === rosterId) {
                if (team1.points > team2.points) wins++
                else if (team1.points < team2.points) losses++
                else ties++
            } else if (team2.roster_id === rosterId) {
                if (team2.points > team1.points) wins++
                else if (team2.points < team1.points) losses++
                else ties++
            }
        }
    }

    return { wins, losses, ties }
}

/**
 * Get color class for record
 * @param {Number} wins 
 * @param {Number} losses 
 * @returns {String} Tailwind CSS class
 */
export const getRecordColor = (wins, losses) => {
    if (wins > losses) return 'text-green-400'
    else if (wins < losses) return 'text-red-400'
    return 'text-gray-400'
}

/**
 * Get bracket round name
 * @param {Number} round 
 * @returns {String} Round name
 */
export const getBracketRoundName = (round) => {
    const rounds = {
        1: 'Quarterfinal',
        2: 'Semifinal',
        3: 'Championship'
    }
    return rounds[round] || `Round ${round}`
}
