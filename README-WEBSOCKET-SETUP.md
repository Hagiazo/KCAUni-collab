# UniCollab WebSocket Server Setup

This guide will help you set up the real-time collaboration features for UniCollab.

## 🚀 Quick Start (Local Development)

### Option 1: Run WebSocket Server Locally

1. **Navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the WebSocket server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

4. **The server will run on `http://localhost:3001`**

### Option 2: Use Without WebSocket Server (Offline Mode)

The application will automatically fall back to local storage mode if the WebSocket server is not available. This allows basic collaboration features to work offline.

## 🌐 Production Deployment

### Deploy to Heroku

1. **Create a new Heroku app:**
   ```bash
   heroku create your-unicollab-websocket
   ```

2. **Deploy the server folder:**
   ```bash
   cd server
   git init
   git add .
   git commit -m "Initial WebSocket server"
   heroku git:remote -a your-unicollab-websocket
   git push heroku main
   ```

3. **Update the WebSocket URL in your frontend:**
   ```typescript
   // In src/lib/websocket.ts, replace:
   this.socket = io('ws://localhost:3001', {
   // With:
   this.socket = io('wss://your-unicollab-websocket.herokuapp.com', {
   ```

### Deploy to Railway

1. **Connect your GitHub repository to Railway**
2. **Set the root directory to `/server`**
3. **Railway will automatically detect and deploy the Node.js app**

### Deploy to Render

1. **Create a new Web Service on Render**
2. **Connect your repository**
3. **Set build command:** `cd server && npm install`
4. **Set start command:** `cd server && npm start`

## 🔧 Features Implemented

### Real-time Collaboration
- **Document Editing**: Multiple users can edit the same document simultaneously
- **Cursor Tracking**: See where other users are typing in real-time
- **Auto-save**: Changes are automatically saved and synchronized
- **Version Control**: Track document versions and changes

### File Sharing
- **Upload Files**: Share files with group members instantly
- **Real-time Notifications**: Get notified when files are uploaded
- **File Preview**: Preview text files directly in the browser
- **Download & Export**: Download shared files easily

### Group Chat
- **Real-time Messaging**: Instant messaging with group members
- **Online Status**: See who's currently online
- **Message History**: Persistent chat history
- **System Messages**: Notifications for user join/leave events

### Task Management
- **Live Updates**: Task changes are synchronized across all users
- **Collaborative Kanban**: Move tasks between columns in real-time
- **Assignment Tracking**: See who's working on what

## 🛠️ Technical Details

### WebSocket Events

The system uses the following WebSocket events:

- `join_group`: User joins a collaboration group
- `document_change`: Real-time document editing
- `cursor_position`: Cursor position tracking
- `chat_message`: Group chat messages
- `file_uploaded`: File sharing notifications
- `task_updated`: Task management updates
- `user_joined`/`user_left`: User presence tracking

### Fallback Mode

If the WebSocket server is unavailable, the application automatically falls back to:
- Local storage for offline collaboration
- Periodic sync when connection is restored
- Basic functionality without real-time features

### Security Considerations

- CORS is configured for development and production
- User authentication should be implemented for production
- File uploads should be validated and scanned
- Rate limiting should be added for production use

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket connection fails:**
   - Check if the server is running on port 3001
   - Verify CORS settings match your frontend URL
   - Check firewall settings

2. **Real-time features not working:**
   - Open browser developer tools and check for WebSocket errors
   - Verify the WebSocket URL in `src/lib/websocket.ts`
   - Check server logs for connection issues

3. **File uploads not working:**
   - Check file size limits
   - Verify file type restrictions
   - Check browser console for errors

### Development Tips

- Use browser developer tools to monitor WebSocket connections
- Check the server health endpoint: `http://localhost:3001/health`
- Monitor server logs for debugging information
- Test with multiple browser tabs to simulate multiple users

## 📚 Next Steps

1. **Database Integration**: Connect to a real database (PostgreSQL, MongoDB)
2. **Authentication**: Implement proper user authentication
3. **File Storage**: Use cloud storage (AWS S3, Google Cloud Storage)
4. **Scaling**: Implement Redis for multi-server WebSocket scaling
5. **Security**: Add rate limiting, input validation, and file scanning
6. **Monitoring**: Add logging and monitoring for production use

## 🤝 Contributing

To contribute to the WebSocket server:

1. Fork the repository
2. Create a feature branch
3. Make your changes in the `server/` directory
4. Test with the frontend application
5. Submit a pull request

For questions or issues, please create an issue in the repository.