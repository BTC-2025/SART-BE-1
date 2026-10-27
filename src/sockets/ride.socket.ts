import { Server as SocketIOServer } from 'socket.io';

export const setupSocketHandlers = (io: SocketIOServer) => {
  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join room for specific booking or ride
    socket.on('join_booking', (bookingId: string) => {
      socket.join(`booking_${bookingId}`);
      console.log(`[Socket.io] Socket ${socket.id} joined booking_${bookingId}`);
    });

    // Handle new booking created by user -> notify business/captains
    socket.on('new_booking_created', (data: any) => {
      console.log(`[Socket.io] New booking created:`, data?.id);
      io.emit('new_incoming_ride', data);
    });

    // Handle live driver location stream
    socket.on('update_driver_location', (data: { driverId: string; lat: number; lng: number; bookingId?: string }) => {
      if (data.bookingId) {
        io.to(`booking_${data.bookingId}`).emit('driver_location_changed', data);
      }
      io.emit('live_marker_update', data);
    });

    // Handle ride status change (e.g. accepted, arriving, in_trip, completed)
    socket.on('ride_status_update', (data: { bookingId: string; status: string; captain?: any }) => {
      console.log(`[Socket.io] Ride status updated:`, data.bookingId, data.status);
      io.to(`booking_${data.bookingId}`).emit('booking_status_changed', data);
      io.emit('ride_status_global_sync', data);
    });

    // Handle chat message between User and Captain with AI Assistant smart reply
    socket.on('send_chat_message', (data: { bookingId: string; sender: 'user' | 'captain'; text: string; time?: string }) => {
      const msgTime = data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const broadcastMsg = { ...data, time: msgTime };

      // Broadcast to room
      io.to(`booking_${data.bookingId}`).emit('chat_message_received', broadcastMsg);

      // If sent by user, provide an intelligent context-aware Captain response (AI Auto-Assistant)
      if (data.sender === 'user') {
        setTimeout(() => {
          const lower = data.text.toLowerCase();
          let smartReply = "Understood! I'm navigating through the quickest route and will be right with you.";

          if (lower.includes('where') || lower.includes('reach') || lower.includes('time') || lower.includes('eta') || lower.includes('late')) {
            smartReply = "I am on the way, approximately 2 to 3 minutes away. Live GPS tracking is active on your screen!";
          } else if (lower.includes('wait') || lower.includes('hold') || lower.includes('coming') || lower.includes('downstairs')) {
            smartReply = "Sure, no problem! Take your time, I will wait at your exact pickup spot.";
          } else if (lower.includes('helmet') || lower.includes('mask') || lower.includes('luggage') || lower.includes('bag')) {
            smartReply = "Sanitized helmet and safety gear are ready. Ample boot/luggage space is available.";
          } else if (lower.includes('change') || lower.includes('cash') || lower.includes('upi') || lower.includes('payment') || lower.includes('qr')) {
            smartReply = "Both Cash and direct QR Code / UPI payment are accepted upon drop-off.";
          } else if (lower.includes('landmark') || lower.includes('gate') || lower.includes('door') || lower.includes('opposite')) {
            smartReply = `Got the landmark instruction: "${data.text}". Heading straight there!`;
          } else if (lower.includes('cancel') || lower.includes('stop')) {
            smartReply = "If you need to change destination or cancel, please tap the cancel/edit button on your screen.";
          } else if (lower.includes('call') || lower.includes('phone') || lower.includes('ring')) {
            smartReply = "Sure, you can tap the call button anytime for a direct voice connect.";
          }

          const aiCaptainMsg = {
            bookingId: data.bookingId,
            sender: 'captain',
            text: smartReply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isAiAssisted: true
          };

          io.to(`booking_${data.bookingId}`).emit('chat_message_received', aiCaptainMsg);
        }, 1100);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
};

