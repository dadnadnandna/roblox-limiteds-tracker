const fetch = require('node-fetch');

// Tracked high-value Roblox User IDs (replace or expand with target active trader IDs)
const TRACKED_USER_IDS = [
    12345678, // Replace with valid Roblox User IDs 
    87654321
];

async function getRolimonsValues(userId) {
    try {
        const res = await fetch(`https://www.rolimons.com/api/playeritems/${userId}`);
        const data = await res.json();
        if (data && data.success) {
            return data.value || 0;
        }
    } catch (e) {
        console.error(`Error fetching rolimons for ${userId}:`, e.message);
    }
    return 0;
}

async function getRobloxPresence(userIds) {
    try {
        const res = await fetch('https://presence.roblox.com/v1/presence/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: userIds })
        });
        const data = await res.json();
        return data.userPresences || [];
    } catch (e) {
        console.error("Error fetching presence:", e.message);
        return [];
    }
}

exports.handler = async function(event, context) {
    try {
        const presences = await getRobloxPresence(TRACKED_USER_IDS);
        const activeInGame = presences.filter(p => p.userPresenceType === 2); // Type 2 = In-Game

        const liveFeedResults = [];

        for (const presence of activeInGame) {
            const userId = presence.userId;
            const totalVal = await getRolimonsValues(userId);
            
            // Only include if value is strictly above 200k
            if (totalVal >= 200000) {
                liveFeedResults.push({
                    userId: userId,
                    location: presence.lastLocation || "In Experience",
                    placeId: presence.placeId,
                    gameId: presence.gameId,
                    value: totalVal,
                    // Roblox protocol link respects privacy and prompts client app join permissions
                    joinLink: `roblox://experiences/start?placeId=${presence.placeId}&gameInstanceId=${presence.gameId}`
                });
            }
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, players: liveFeedResults })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};
