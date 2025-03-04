# Real-time Chat Server

A scalable real-time chat application using Socket.IO with clustering support and message persistence.
#### *Especial thanks to [socket.io](https://socket.io) guys for providing such a cool documentation. I just make what they taught elegantly on their docs.*

## Features

- Multi-core scaling with Node.js cluster module
- Real-time messaging with Socket.IO
- Message persistence with SQLite
- Connection state recovery for clients
- Automatic load balancing across worker processes

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/realtime-chat-server.git
   cd realtime-chat-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the TypeScript code:
   ```bash
   npm run build
   ```

4. Start the server:
   ```bash
   npm start
   ```

## Usage

Once the server is running:

- Open your browser and navigate to `http://localhost:3000`
- Start sending messages in the chat interface
- Open multiple browser windows to see real-time communication
- Messages will persist even if you close and reopen the browser

## Technologies

- Node.js
- TypeScript
- Express
- Socket.IO
- SQLite
- Socket.IO Cluster Adapter

## License

MIT