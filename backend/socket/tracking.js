const setupTracking = (io) => {
    io.on('connection', (socket) => {
        // Users join a "room" named after their Org ID
        socket.on('join_org', (orgId) => {
            socket.join(orgId);
            console.log(`User joined Org Room: ${orgId}`);
        });

        // Driver broadcasts location to everyone in the same Org room
        socket.on('update_location', (data) => {
            // data = { orgId, busId, lat, lng, speed, nextStop }
            io.to(data.orgId).emit('bus_moved', {
                busId: data.busId,
                lat: data.lat,
                lng: data.lng,
                timestamp: new Date()
            });
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });
    });
};

module.exports = setupTracking;