import {connectToDatabase} from "@/database/mongoose";

export const getAllUsersForNewsEmail = async () => {
    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if(!db) throw new Error('Mongoose database connection not provided');

        // Fetch suppressed emails to exclude from newsletter sends
        const suppressed = await db.collection('emailsuppressions')
            .find({}, { projection: { _id: 0, email: 1 } })
            .toArray();
        const suppressedSet = new Set((suppressed || []).map((s: any) => String(s.email || '').toLowerCase()));

        const users = await db.collection('user').find(
            { email: { $exists: true, $ne: null } },
            { projection: { _id: 1, id: 1, email: 1, name: 1, country: 1 } },
        ).toArray();

        return users
            .filter((user) => user.email && user.name && !suppressedSet.has(String(user.email).toLowerCase()))
            .map((user) => ({
                id: user.id || user._id?.toString() || '',
                email: user.email,
                name: user.name
            }));
    } catch (e) {
        console.error("Error Fetching users for news email", e);
        return []
    }
}