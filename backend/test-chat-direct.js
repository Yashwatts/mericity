const mongoose = require("mongoose");
const Chat = require("./models/Chat");
const Complaint = require("./models/Complaint");

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/SIH2024", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Connected to MongoDB");
  testChatFunctionality();
}).catch((err) => {
  console.error("MongoDB connection error:", err);
});

async function testChatFunctionality() {
  try {
    console.log("\n=== Testing Chat Functionality ===");
    
    // Find any complaint with in_progress status
    const complaint = await Complaint.findOne({ status: 'in_progress' }).populate('userId', 'name email');
    
    if (!complaint) {
      console.log("No in_progress complaint found. Please make sure there's at least one in_progress complaint.");
      process.exit(1);
    }
    
    console.log(`Found complaint: ${complaint._id} by ${complaint.userId.name}`);
    
    // Test chat creation
    const chatType = 'user-department';
    let chat = await Chat.findOne({ complaintId: complaint._id, chatType });
    
    console.log(`\nExisting chat found: ${chat ? 'YES' : 'NO'}`);
    
    if (!chat) {
      // Create new chat
      chat = new Chat({
        complaintId: complaint._id,
        chatType,
        participants: [
          {
            participantId: complaint.userId._id,
            participantModel: 'User',
            participantName: complaint.userId.name,
            participantRole: 'user'
          }
        ]
      });
      
      await chat.save();
      console.log(`Created new chat: ${chat._id}`);
    } else {
      console.log(`Using existing chat: ${chat._id} with ${chat.messages.length} messages`);
    }
    
    // Test message creation
    const testMessage = {
      senderId: complaint.userId._id,
      senderModel: 'User',
      senderName: complaint.userId.name,
      senderRole: 'user',
      content: `Test message at ${new Date().toLocaleString()}`,
      messageType: 'text',
      timestamp: new Date(),
      isRead: []
    };
    
    chat.messages.push(testMessage);
    await chat.save();
    
    console.log(`\nAdded test message. Chat now has ${chat.messages.length} messages`);
    
    // Test retrieval
    const retrievedChat = await Chat.findOne({ complaintId: complaint._id, chatType });
    console.log(`Retrieved chat has ${retrievedChat.messages.length} messages`);
    
    // Display messages
    if (retrievedChat.messages.length > 0) {
      console.log("\nLast 3 messages:");
      const lastMessages = retrievedChat.messages.slice(-3);
      lastMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. [${msg.senderName}] ${msg.content} (${msg.timestamp})`);
      });
    }
    
    console.log("\n✅ Chat functionality test completed successfully!");
    
  } catch (error) {
    console.error("❌ Chat test failed:", error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}