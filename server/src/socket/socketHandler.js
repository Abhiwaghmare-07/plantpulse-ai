/**
 * socketHandler.js
 * Manages the Socket.io server instance and provides emit helpers
 * used by controllers and the simulator to push real-time updates.
 */

let _io = null;

/**
 * Initialise and store the Socket.io server instance.
 * Called once from server.js after the HTTP server is created.
 * @param {import('socket.io').Server} io
 */
function init(io) {
  _io = io;

  io.on('connection', (socket) => {
    console.log(`🔌 Socket.io client connected   [id=${socket.id}]`);

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket.io client disconnected [id=${socket.id}] reason=${reason}`);
    });
  });
}

/**
 * Emit a "machine:update" event to all connected clients.
 * Payload: { machineId, name, status, lastReading, lastUpdated, prediction }
 * @param {object} payload
 */
function emitMachineUpdate(payload) {
  if (!_io) return;
  _io.emit('machine:update', payload);
}

/**
 * Emit an "alert:new" event to all connected clients.
 * Payload: full Alert document
 * @param {object} alertDoc
 */
function emitNewAlert(alertDoc) {
  if (!_io) return;
  _io.emit('alert:new', alertDoc);
}

module.exports = { init, emitMachineUpdate, emitNewAlert };
